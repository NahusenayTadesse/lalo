# Bug Report — Lalo Bakery

Audit date: 2026-08-10 · Branch: `main` @ `1974312`

Scope: server routes (`+page.server.ts`, `+server.ts`, hooks), shared server helpers
(`src/lib/server/*`), form schemas, and Svelte component reactivity. Findings were confirmed by
reading the code and by running `vite build` (passes) and `svelte-check` (710 errors, 160 warnings).

| Severity | Count | Fixed |
| --- | --- | --- |
| Critical | 5 | **5 — all fixed** (C1–C5) |
| High | 9 | 2 (H8, H9) |
| Medium | 14 | — |
| Low | 6 | — |

H8 and H9 were not in the original audit — each surfaced while fixing a Critical (H8 while fixing
C2, H9 while testing C4) and both are documented at the end of the High section. `svelte-check` is
down from 710 errors to 701; `vite build` passes.

**Every Critical finding is fixed and verified against a running server.** Two of them leaked data
that a code fix cannot un-leak — see the credential-rotation note under C5.

---

## Critical

### C1. Dashboard form actions have no authorization at all — ✅ FIXED (2026-08-10)

**Where:** every `+page.server.ts` under `src/routes/dashboard/`, guard at
`src/routes/dashboard/+layout.server.ts:9-17`

The only admin check in the app lives in a **layout `load`**:

```ts
// dashboard/+layout.server.ts
if (locals.user) {
    if (roleName !== 'Admin') return error(404, 'Not Allowed');
} else {
    return redirect(302, '/login');
}
```

In SvelteKit, **`load` functions do not run before a form action** — the action executes first, and
loads run afterwards only to re-render. A redirect or error thrown in a layout `load` therefore
cannot stop an action that has already written to the database.

Not a single dashboard action re-checks the caller. `grep` for `locals.user` in those files only
turns up `createdBy: locals?.user?.id` audit columns, never a guard.

**Impact:** any signed-in customer (role `Customer`, `roleId: 2`) can POST directly to any dashboard
action and add/edit/delete products, categories, orders, prices, suppliers, roles, payment methods,
and users. SvelteKit's default CSRF origin check blocks a cross-site form post, but not a logged-in
customer using devtools, nor `curl` with a matching `Origin` header.

**Failure scenario:** a customer runs
`fetch('/dashboard/products/categories?/add', {method:'POST', body: fd})` from the browser console
on the site — the category row is created, and the response is a 302 to `/login` that the attacker
ignores.

**Fix:** move the check into `hooks.server.ts` so it covers every request method, not just loads:

```ts
// src/hooks.server.ts
const handleAuth: Handle = async ({ event, resolve }) => {
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (session) {
        event.locals.session = session.session;
        event.locals.user = session.user;
    }

    if (event.url.pathname.startsWith('/dashboard')) {
        if (!event.locals.user) throw redirect(302, '/login');
        const role = await getRoleName(event.locals.user.id); // cache this
        if (role !== 'Admin') throw error(403, 'Not allowed');
    }

    return svelteKitHandler({ event, resolve, auth, building });
};
```

Keep the layout check too (it produces the nicer UX), but the hook is what actually enforces it.
Consider a `requireAdmin(locals)` helper called at the top of each action as defence in depth.

**Resolution.** Implemented as described, across five files:

- **`src/lib/server/authz.ts`** (new) — `ADMIN_ROLE`, `getRoleName(userId)`, and `requireAdmin(locals)`.
- **`src/hooks.server.ts`** — guards every `/dashboard` request regardless of method, and caches the
  resolved role on `locals.roleName`. Skipped when `building` so it can't interfere with prerendering.
- **`src/app.d.ts`** — added `roleName?: string` to `App.Locals`.
- **`src/routes/dashboard/+layout.server.ts`** — now calls `requireAdmin(locals)`, reusing the cached
  role instead of re-running the join.
- **`src/routes/+layout.server.ts`** — reuses `locals.roleName` when the hook already resolved it,
  removing one duplicate query per dashboard request (a partial fix for M14).

Verified against the running dev server and the local `lalo` database:

| | pre-fix | post-fix |
| --- | --- | --- |
| Unauthenticated `POST /dashboard/products/categories?/add` | `{"type":"success"}`, **row inserted** | `{"type":"redirect","status":303,"location":"/login"}`, no row |
| `GET /dashboard` unauthenticated | 303 → `/login` | 303 → `/login` |
| `GET /`, `/login`, `/shop` | 200 | 200 |

The exploit row created during the pre-fix run was deleted afterwards; `product_categories` is back to
its original 4 rows. Replaying the guard's join over the real user table shows the one `Admin` user
allowed and all 6 `Customer` users blocked, so no legitimate access was lost. `svelte-check` still
reports 710 errors / 160 warnings — identical to the pre-change baseline, i.e. no new type errors.

Note this closes the `/dashboard` surface only. **C2, C3, and C4 are separate holes on the
customer-facing `/orders` and `/checkout` routes and are not affected by this fix.**

---

### C2. Any signed-in user can edit anyone else's order — ✅ FIXED (2026-08-10)

**Where:** `src/routes/orders/+page.server.ts:130-169` (`edit`), `:92-129` (`add`)

```ts
edit: async ({ request, locals }) => {
    const { id, selectedProducts, customer } = form.data;
    await tx.update(orders)
        .set({ customerId: customer })
        .where(eq(orders.id, Number(id)));   // ← no ownership check
    await tx.delete(orderItems).where(eq(orderItems.orderId, Number(id)));
    ...
}
```

`id` and `customer` both come from the submitted form and are never checked against the caller. This
is a **customer-facing** route, so no admin role is needed.

**Failure scenario:** customer A posts `?/edit` with `id=57` (customer B's order) — B's line items
are deleted and replaced, and `customerId` can be reassigned to A. The same hole in `add` lets A
create orders billed to B.

**Fix:** resolve the caller's `customers.id` server-side and constrain every write to it. Never
accept `customer` from the client:

```ts
const [me] = await db.select({ id: customers.id })
    .from(customers).where(eq(customers.userId, locals.user!.id)).limit(1);
if (!me) return message(form, { type: 'error', text: 'No customer profile' }, { status: 403 });

const [res] = await tx.update(orders)
    .set({ /* no customerId */ })
    .where(and(eq(orders.id, Number(id)), eq(orders.customerId, me.id)));
if (res.affectedRows === 0) return message(form, { type: 'error', text: 'Order not found' }, { status: 404 });
```

Also add a `if (!locals.user) throw error(401)` at the top of both actions — the `load` guard at
line 12 does not protect them (see C1).

**Correction after testing.** The severity above is right about the *code*, but wrong about live
exploitability, and the difference matters:

Replaying the attack against the pre-fix code (signed in as a throwaway customer, POSTing
`?/edit` with `id=5` — an order belonging to customer "Hanan") returned
`"Error Updating Orders: Cannot convert undefined or null to object"`, and Hanan's order was
untouched. The cause is **H-new below**: `getPrice()` selected `products.price`, a column that does
not exist, so the action threw on its first query — before reaching the unguarded `update`.

So C2 was a **latent** hole, not an actively exploited one: the missing ownership check was real, but
an adjacent bug crashed the action first. That is the dangerous kind of finding — fixing the pricing
bug alone (which this route needed anyway) would have *activated* a live IDOR. Both were fixed
together, deliberately.

**C3 was fully live** and is confirmed separately below.

**Resolution.** `src/routes/orders/+page.server.ts` rewritten:

- `getOwnCustomerId(userId)` resolves the caller's `customers.id` from the session. The posted
  `customer` field is now ignored everywhere.
- `add` and `edit` each check `locals.user` themselves (per C1, `load` cannot protect them) and
  return 401/403 messages rather than throwing.
- `edit` proves ownership with a scoped `SELECT` before touching anything, so the subsequent
  `orderItems` delete/insert cannot reach another customer's order. It returns 404 when the order
  isn't the caller's, and is restricted to the `pending`/`cancelled` statuses this page exposes so a
  delivered order can't be rewritten after the fact.
- `customerId` is no longer updatable — an order never changes owner.

Verified end-to-end against a throwaway customer account (since removed):

| | pre-fix | post-fix |
| --- | --- | --- |
| `POST /orders?/edit` on another customer's order #5 | action crashed; no ownership check in the code path | `404 "Order not found"` |
| Order #5's line items afterwards | unchanged (crash, not a guard) | unchanged (guard) |

---

### C3. `/orders` load ships every customer's order items to every customer — ✅ FIXED (2026-08-10)

**Where:** `src/routes/orders/+page.server.ts:65-77`

```ts
const allItems = await db
    .select({ id: orderItems.id, orderId: orderItems.orderId, product: products.name,
              quantity: orderItems.quantity, price: orderItems.price, ... })
    .from(orderItems)
    .leftJoin(orders, and(eq(orders.id, orderItems.orderId), eq(orders.status, 'pending')))
    .leftJoin(products, eq(orderItems.productId, products.id));
    // ← no .where() at all
```

Putting `eq(orders.status, 'pending')` in the `LEFT JOIN` condition does not filter anything — a
`LEFT JOIN` keeps every row of `orderItems` regardless. There is no customer filter either.

**Impact:** the whole `orderItems` table (product, quantity, price, order id) is serialised into the
page payload for every logged-in customer. `allData` is correctly scoped; `allItems` is not.

**Fix:** scope it to the orders that were actually returned:

```ts
const orderIds = allData.map((o) => o.id);
const allItems = orderIds.length
    ? await db.select({ ... })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(inArray(orderItems.orderId, orderIds))
    : [];
```

**Resolution.** Fixed as described. `fetchedCustomers` was scoped to the caller in the same pass — it
was selecting every row of the `customers` table and handing the list to the client, which leaked all
customer names alongside the order items.

Confirmed by decoding the actual `/orders/__data.json` payload for a throwaway customer who owns
**zero** orders:

| | pre-fix | post-fix |
| --- | --- | --- |
| `allData` (their own orders) | `[]` | `[]` |
| `allItems` | **6 items, from orders 4, 5, 6, 7, 8** — all other customers' | `0` |
| `fetchedCustomers` | **7** (every customer) | `1` (themselves) |

Note a plain string search on that payload is misleading: variant labels like `"Sprinkles-Big"` and
prices like `"2250.00"` legitimately remain, because they are catalog data from `fetchedPrices` that
the order form needs. The decoded `allItems`/`fetchedCustomers` arrays above are the accurate measure.

---

### C4. Checkout trusts client-supplied prices and delivery fee — ✅ FIXED (2026-08-10)

**Where:** `src/routes/checkout/+page.server.ts:88-101`

```ts
await tx.insert(orderItems).values(
    selectedProducts.map((product) => ({
        productId: Number(product.product),
        quantity: Number(product.quantity),
        price: Number(product.price)      // ← straight from the form
    }))
);
const total = selectedProducts.reduce((acc, p) => acc + p.price * p.quantity, 0);
```

`price` and `fee` (line 84) are whatever the browser posted. Tellingly, the file already defines a
server-side price lookup at line 127 — `getPrice()` — and **never calls it**; the sibling
`/orders` route does use it.

**Failure scenario:** a customer edits the form payload to `price=1`, checks out, and the order,
the order-confirmation email, and every downstream revenue report all record 1 birr per item.

**Fix:** look prices up from `prices`/`products` inside the transaction and ignore the posted value;
do the same for `fee` via `placeNames.fee` keyed on the chosen `deliveryAddress`:

```ts
const priceRows = await tx.select({ productId: prices.productId, amount: prices.amount, price: prices.price })
    .from(prices).where(inArray(prices.productId, selectedProducts.map(p => Number(p.product))));

const resolved = selectedProducts.map((p) => {
    const row = priceRows.find(r => r.productId === Number(p.product) && r.amount === p.amount);
    if (!row) throw new Error('Unknown product variant');
    return { ...p, price: Number(row.price) };
});
```

Compute `total` from `resolved`, not from the request.

**Correction to the fix sketch above:** the fee is keyed on **`address`**, not `deliveryAddress`.
`address` is a `<select>` bound to `place_names.name`; `deliveryAddress` is the free-text street
address and carries no fee.

**Resolution:** `resolveLineItems()` re-reads every price from `prices` keyed on
`(product_id, amount)` and `resolveFee()` re-reads the fee from `place_names` (active rows only),
applying the `free_delivery.threshold` rule server-side. Neither the posted `price` nor the posted
`fee` is read out of the form any more — `total` and the confirmation emails are both computed from
the resolved rows, so the email can't quote a figure that differs from the order. The dead
`getPrice()` helper, whose existence was the original tell, is gone.

Three things were fixed alongside it, all in the same request path:

- The action had **no authentication check**. Actions run before `load`, so nothing guarded it;
  `eq(customers.userId, undefined)` merely made it crash rather than let a guest through.
- A signed-in user with no `customers` row hit `customer.value` on `undefined`. Now a clean 403.
- `fee` was `z.number().positive()`, so an order over the free-delivery threshold posted `fee: 0`
  and was **rejected as invalid** — free delivery made checkout impossible. It is now optional and
  non-negative, since the server computes it regardless.
- `console.log(form.data)` printed the customer's address to stdout on every checkout; removed.

**Verified end-to-end against a running dev server** with a throwaway account, posting a tampered
payload (`price: 1`, `fee: 0.01`) for a variant whose real price is 150.00 in an area whose real fee
is 200.00. The *same request* was replayed against both versions:

| | before | after |
| --- | --- | --- |
| `order_items.price` written | **1.00** | 150.00 |
| `orders.fee` written | **0.01** | 200.00 |
| order total | **2.01** | 500.00 |

Edge cases, all confirmed after the fix:

| Request | Result |
| --- | --- |
| cart ≥ `free_delivery.threshold`, posted `fee: 0.01` | accepted, `orders.fee` = **0.00** (rule applied server-side) |
| `address` not in `place_names` | rejected — "We do not deliver to that area" |
| variant that doesn't exist | rejected — "One of the items in your cart is no longer available" |
| no session cookie | rejected — "Please sign in to place an order" |
| empty cart | rejected — "Your cart is empty", no row written |

`svelte-check` 706 → 701; `vite build` passes. All probe rows were removed afterwards (user 7,
customers 6, orders 6, order_items 6 — the original counts).

**Note on duplication:** `/orders` has its own `resolveLineItems()`. The two differ for a real
reason — `/orders` posts a combined `"<price> <amount>"` label and has to split it, while the cart
stores `prices.amount` verbatim — so they were left separate rather than force-fitted into one
helper. Worth unifying if the `/orders` form ever stops sending the combined label.

---

### C5. Path traversal in the file-serving endpoint — ✅ FIXED (2026-08-10)

**Where:** `src/routes/files/[name]/+server.ts:16`

```ts
const file_path = path.normalize(path.join(FILES_DIR, params.name));
if (!fs.existsSync(file_path)) return new Response('not found', { status: 404 });
// ... streams file_path back
```

SvelteKit URL-decodes route params, so `%2F` in the request path becomes a real `/` inside
`params.name`. `path.join` then resolves the `..` segments and walks out of `FILES_DIR`. There is no
containment check after normalising.

**Failure scenario:** `GET /files/..%2F..%2F.env` returns the environment file — which in this repo
holds `DATABASE_URL`, `BETTER_AUTH_SECRET`, and the SMTP password. `Content-Type` falls back to
`application/octet-stream`, so the response downloads cleanly. Worth confirming against a running
dev server before/after the fix:

```bash
curl -i 'http://localhost:5173/files/..%2F..%2F.env'
```

**Fix:** resolve both paths and assert containment:

```ts
const root = path.resolve(FILES_DIR);
const file_path = path.resolve(root, params.name);
if (file_path !== root && !file_path.startsWith(root + path.sep)) {
    return new Response('not found', { status: 404 });
}
```

Rejecting any `params.name` containing `/` or `\` outright is an equally good fix here, since stored
names are flat UUIDs.

**Resolution:** `FILES_ROOT` is now resolved once at module load, `params.name` is resolved against
it with `path.resolve`, and a containment check (`isInsideFilesDir`) runs before anything touches the
filesystem. Escapes get the same `404 not found` as a missing file, so the response can't be used to
probe for paths outside the directory. Also added an `isFile()` check — `statSync` on a directory
previously produced a 200 with a nonsense body.

**Verified against a running dev server**, unauthenticated, no session cookie:

| Request | Before | After |
| --- | --- | --- |
| `GET /files/..%2F.env` | **200, full env file (416 bytes)** | 404 |
| `GET /files/..%2F..%2Fetc%2Fpasswd` | 200 | 404 |
| `GET /files/%2Fetc%2Fpasswd` (absolute) | 200 | 404 |
| `GET /files/..%5C.env` (backslash) | 404 | 404 |
| `GET /files/..%252F.env` (double-encoded) | 404 | 404 |
| `GET /files/.` (the directory itself) | 200, garbage body | 404 |
| `GET /files/<real-uuid>.jpg` | 200, `image/jpeg` | 200, `image/jpeg` |
| same + matching `If-None-Match` | 304 | 304 |
| `GET /files/does-not-exist.jpg` | 404 | 404 |

The leaked body contained `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `SMTP_PASSWORD` in cleartext.

> ⚠️ **Rotate these credentials.** The `.env` served here also carries a commented-out
> `DATABASE_URL` pointing at a **remote production host** with its username and password. Any
> deployment that ran this endpoint could have had the file pulled by anyone who knew the URL, with
> no login. Fixing the code does not un-expose what was already reachable — the database password,
> `BETTER_AUTH_SECRET` (which signs every session), and the SMTP password should all be rotated,
> and `BETTER_AUTH_SECRET` rotation will invalidate existing sessions.

**Still worth doing (not covered by this fix):** a symlink inside `FILES_DIR` pointing outside it
would still be followed, since containment is checked on the resolved path, not the real path. Uploads
are app-written UUIDs so nothing creates one today; `fs.realpathSync` before the check would close it
if that ever changes.

---

## High

### H1. Database credentials printed to stdout on every boot

**Where:** `src/lib/server/db/index.ts:8`

```ts
console.log('DATABASE_URL:', env.DATABASE_URL);
```

The connection string contains the DB user and password. It lands in the process log, and on a
managed host in the log aggregator, where it long outlives the session.

**Fix:** delete the line. If a startup signal is wanted, log the host only:
`console.log('DB:', new URL(env.DATABASE_URL).host)`.

---

### H2. Every user created from the admin panel becomes role 1

**Where:** `src/routes/dashboard/admin-panel/users/add-users/+page.server.ts:52-60`

```ts
const newCustomer = await auth.api.createUser({
    body: { email, password, name, role: role === 1 ? 'admin' : 'user' }
});
await tx.update(user).set({ roleId: 1 }).where(eq(user.id, newCustomer?.user.id));
//                              ^^^^^^^ hardcoded, ignores the selected `role`
```

The form's `role` select is honoured for better-auth's own `role` string but discarded for the
app's `roleId` — which is the field `+layout.server.ts` actually joins on to decide who is `Admin`.

**Impact:** an admin creating a staff or customer account silently grants full dashboard access.

**Fix:** `set({ roleId: role })`. Then validate `role` against the `roles` table rather than trusting
the posted id, since the schema only checks `z.number()`.

---

### H3. Dashboard "payments collected" is multiplied by the item count

**Where:** `src/routes/dashboard/+page.server.ts:38-73`

```ts
.from(orders)
.leftJoin(orderItems, eq(orders.id, orderItems.orderId))   // fans out: N rows per order
.leftJoin(transactions, eq(orders.transactionId, transactions.id))
...
totalPaymentsCollected: sql`coalesce(sum(case when ... then ${transactions.amount} else 0 end), 0)`
```

Joining `orderItems` multiplies each order into one row per line item. `transactions.amount` is an
order-level value, so summing it across the fanned-out rows counts each payment once per item.

**Failure scenario:** one delivered order of 300 birr with 4 line items reports
`totalPaymentsCollected = 1200`. `totalRevenue` and `totalItemsSold` are correct; only the
transaction sum is wrong.

**Fix:** aggregate order-level and item-level figures in separate queries (the `reports` page already
does this correctly — see its `orderLevelRows` block at `reports/+page.server.ts:120`):

```ts
const [payments] = await db
    .select({ total: sql`coalesce(sum(${transactions.amount}), 0)` })
    .from(orders)
    .leftJoin(transactions, eq(orders.transactionId, transactions.id))
    .where(and(eq(orders.status, 'delivered'), sql`${orders.createdAt} >= CURRENT_DATE()`, ...));
```

---

### H4. Edit forms show the previous record after client-side navigation

**Where:** ~40 components; `svelte-check` flags 97 instances of
`state_referenced_locally` on `data`. Representative:
`dashboard/products/single/[id]/+page.svelte:65-71`,
`dashboard/customers/[id]/+page.svelte:103-107`,
`dashboard/products/single/[id]/editPrice.svelte:40-42`,
`dashboard/admin-panel/users/[id]/+page.svelte:58-60`

```svelte
const { form } = superForm(data.form, { ... });

if (data.product) {
    $form.productName = data.product.name;   // runs once, at component init
    $form.category = data.product.categoryId;
    ...
}
```

These assignments sit at the top level of `<script>`, so they run once when the component is created.
When SvelteKit navigates between two records on the same route it **reuses the component instance**
and only updates the `data` prop — the assignments never re-run.

**Failure scenario:** open product 1, click through to product 2. The page heading updates, but the
Edit form is still populated with product 1's name, category, quantity, and supplier. Saving writes
product 1's values onto product 2.

**Fix:** run the sync in an effect keyed on the prop, so it re-fires when `data` changes:

```svelte
$effect(() => {
    if (!data.product) return;
    $form.productName = data.product.name;
    $form.category = data.product.categoryId;
    ...
});
```

For the many small `edit.svelte`/`delete.svelte` dialogs that take scalar props, the same rule
applies — move `$form.x = prop` into `$effect`. Where the form should simply track the server data,
superForm's `{ dataType: 'json' }` + passing a fresh `data.form` per navigation is cleaner still.

---

### H5. The role edit and delete actions do not exist

**Where:** `src/routes/dashboard/admin-panel/roles/[id]/+page.server.ts:62-118`

The entire `export const actions` block is commented out, but
`roles/[id]/+page.svelte:97` still renders `<form use:enhance action="?/edit" method="POST">` and
line 89 renders `<Delete redirect="/dashboard/admin-panel/roles" />`.

**Impact:** submitting the role edit form POSTs to an action that does not exist. SvelteKit responds
404 (`No actions found`), so the admin gets a hard error page — roles cannot be edited or deleted at
all.

**Fix:** either restore the commented block (it looks complete — it handles `ER_DUP_ENTRY` and
re-syncs `rolePermissions`) or remove the Edit button and `<Delete>` from the page. If restoring, add
the missing auth guard from C1 and wrap the `delete`+`insert` of `rolePermissions` in the existing
transaction so a failure can't leave a role with no permissions.

---

### H6. Auth writes are not covered by the surrounding transaction

**Where:** `src/routes/signup/+page.server.ts:61-79`, `admin-panel/users/add-users/+page.server.ts:46-61`

```ts
await db.transaction(async (tx) => {
    const newCustomer = await auth.api.signUpEmail({ body: { ... } });  // uses `db`, not `tx`
    await tx.update(user).set({ roleId: 2 }).where(eq(user.id, newCustomer?.user.id));
    await tx.insert(customers).values({ ... });
});
```

better-auth holds its own drizzle handle and issues its writes on a separate pool connection. They
are outside `tx` and are not rolled back with it.

**Failure scenario:** the `customers` insert fails (duplicate phone, bad `deliveryAddress`). The
`tx` rolls back, the user sees "Registration Failed" — but the better-auth `user` row survives with
no `roleId` and no `customers` profile. The email is now taken, so retrying signup fails forever, and
`account/settings` 404s for that account (`if (!singleUser) error(404)`).

**Fix:** create the auth user first, outside the transaction, then run the app-table writes in a
transaction and compensate on failure:

```ts
const newUser = await auth.api.signUpEmail({ body: { ... } });
try {
    await db.transaction(async (tx) => {
        await tx.update(user).set({ roleId: 2 }).where(eq(user.id, newUser.user.id));
        await tx.insert(customers).values({ ... });
    });
} catch (err) {
    await auth.api.removeUser({ body: { userId: newUser.user.id } }); // compensating delete
    throw err;
}
```

---

### H7. A non-numeric `page` query param 500s the listing pages

**Where:** `src/routes/dashboard/orders/+page.server.ts:34,37` and
`src/routes/dashboard/reports/+page.server.ts:47,50`

```ts
const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
const offset = (page - 1) * PAGE_SIZE;
```

`parseInt('abc')` is `NaN`, and `Math.max(1, NaN)` is `NaN` — `Math.max` propagates `NaN` rather
than ignoring it. `offset` becomes `NaN` and reaches `.offset(NaN)`, producing a MySQL syntax error.

**Failure scenario:** `/dashboard/reports?page=abc` (or a truncated/mangled link) returns a 500
instead of page 1.

**Fix:**

```ts
const parsed = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
const page = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
```

Clamping `page` to `totalPages` after the count query would also stop deep out-of-range pages from
rendering an empty table with no explanation.

---

### H8. `/orders` priced everything off a column that doesn't exist — ✅ FIXED (2026-08-10)

**Found while fixing C2.** Not in the original audit — `svelte-check` had already flagged it among
the 710 errors, where it was invisible in the noise.

**Where:** `src/routes/orders/+page.server.ts:103,141,172` (pre-fix)

```ts
const fetchedProducts = await tx
    .select({ value: products.id, price: products.price })   // ← no such column
    .from(products);
```

`products` has no `price` column — prices live in the `prices` table, keyed by `(productId, amount)`
variant (`schema.ts:44-49`). `products.price` evaluated to `undefined`, so the query threw
`Cannot convert undefined or null to object` on its first line.

**Impact:** both `/orders` actions were dead. Adding or editing an order from the customer orders
page always failed with `"Error Adding/Updating Orders: …"`. This is what masked C2.

A second, independent breakage in the same block: `edit` inserted `orderItems` rows without `amount`,
which is `notNull` — and the database runs in `STRICT_TRANS_TABLES`, so that insert would have been
rejected too even once the price lookup was fixed.

**Fix applied:** replaced `getPrice()` with `resolveLineItems()`, which reads the authoritative price
from `prices` for each `(productId, variant)` pair and throws if the pair doesn't exist (rolling back
the transaction). The client's chosen label is used only for the *variant* half — the price half is
re-read from the database, so a tampered label cannot set the price. This is the same class of fix
C4 needs on `/checkout`, applied here pre-emptively. `amount` is now written on both paths.

Two smaller corrections in the same file:

- `add` left `orders.status` null, so a newly created order never matched the `pending`/`cancelled`
  filter in `load` and never appeared in the customer's own list. Now set to `'pending'`.
- `load` filtered on `eq(orders.customerId, customerId?.value)` with a possibly-`undefined` value,
  which throws for a signed-in user with no `customers` row. It now returns empty lists instead.

After this, `svelte-check` reports **0 errors** in the file, down from 6.

---

### H9. An unreachable mail server crashes the whole app — ✅ FIXED (2026-08-10)

**Where:** `src/routes/signup/+page.server.ts:82`, `src/routes/contact-us/+page.server.ts:34,37`

Not in the original audit — found while testing C4, by pointing SMTP at a dead port.

```ts
sendEmail(email, subject, html);   // not awaited, no .catch
```

`sendEmail` is `async` and these three call sites neither `await` it nor attach a handler. The
surrounding `try/catch` cannot see the rejection, because the action has already returned by the
time nodemailer gives up. Node treats it as an unhandled rejection and **terminates the process**.

**Failure scenario:** the mail host has a blip. One customer signs up, or one person uses the
contact form, and the entire site goes down — not the request, the server. Observed directly:

```
Error: connect ECONNREFUSED 127.0.0.1:2525
    at TCPConnectWrap.afterConnect
Node.js v22.23.1        ← process exited
```

**Fix applied:** `.catch((err) => console.error(...))` on all three, matching the pattern the
checkout and dashboard-orders routes already used correctly. The email stays fire-and-forget; only
the crash is removed.

Not covered here: a failed welcome or confirmation email is now silent apart from a log line. A
retry queue, or surfacing "we couldn't email you a receipt" to the user, is the real answer if these
emails matter.

---

## Medium

### M1. `FILES_DIR` defaults disagree — uploads land where nothing serves them

`src/lib/server/upload.ts:9` defaults to `.tempFiles`; `src/routes/files/[name]/+server.ts:8`
defaults to `.temp-files`. `.env` sets `FILES_DIR`, so this is latent today — but `.env.example`
omits the key entirely, so a fresh checkout writes uploads to one directory and serves 404s from
another.

**Fix:** export one constant from a shared module and import it in both places; add `FILES_DIR` to
`.env.example`.

### M2. `editGallery` uses form data without validating it

`dashboard/products/single/[id]/+page.server.ts:236-254` destructures `form.data` with no
`if (!form.valid)` check — every other action in the file has one. On an invalid submission
`existing` is `undefined` and `existing.split(',')` throws a `TypeError`, which the catch reports as
`Unexpected Error: Cannot read properties of undefined`.

**Fix:** add the standard guard before line 240.

### M3. Editing a product without re-picking an image

`dashboard/products/single/[id]/+page.server.ts:37` tests `if (image)`, but an untouched file input
still submits a zero-byte `File`, which is truthy. The `edit` schema
(`single/[id]/schema.ts:32-37`) has no size floor, and its `ACCEPTED_FILE_TYPES` refine rejects the
empty file's `application/octet-stream` type — so the form fails validation with a confusing "check
your form data" instead of just keeping the existing image. `crud.ts:115` gets this right and
documents why.

**Fix:** mirror `crud.ts` — `if (image instanceof File && image.size > 0)` — and let the schema skip
empty files: `.refine((f) => f.size === 0 || ACCEPTED_FILE_TYPES.includes(f.type), ...)`.

### M4. Price actions are not scoped to the product in the URL

`dashboard/products/single/[id]/+page.server.ts:284-352`. `editPrice` and `deletePrice` filter on
`eq(priceList.id, id)` where `id` comes from a hidden form field, never on `params.id`. Any price row
of any product can be edited or deleted by changing that field. Combined with C1 this is reachable
by any signed-in user.

**Fix:** `and(eq(priceList.id, id), eq(priceList.productId, Number(params.id)))`, and check
`affectedRows` to report a 404 when it doesn't match. Separately, `editPrice` writes the primary key
back to itself (`.set({ id, price, amount })`) — drop `id` from the `set`.

### M5. Un-delivering an order restores the wrong stock quantities

`dashboard/orders/+page.server.ts:293-315`. The stock adjustment loop iterates `selectedProducts` —
the **newly submitted** item list — for both directions. On `leftDelivered` it must reverse what was
originally deducted.

**Failure scenario:** an order of 10 units is delivered (stock −10). The admin then edits it down to
2 units *and* sets status back to pending in one save. Stock is credited +2, leaving 8 units
permanently missing from inventory.

**Fix:** on `leftDelivered`, read the existing `orderItems` rows for the order *before* deleting them
and use those quantities for the reversal.

### M6. Deleting a product with sales history fails

`dashboard/products/single/[id]/+page.server.ts:166` runs a bare
`db.delete(products).where(eq(products.id, ...))`. In `schema.ts`, `orderItems.productId` (line 132)
has **no** `onDelete` rule, unlike `productImages`, `prices`, and `productAdjustments` which cascade.

**Failure scenario:** deleting any product that has ever been ordered raises a foreign-key error, and
the admin sees "Unexpected Error: Cannot delete or update a parent row". The orders delete action
(`orders/+page.server.ts:367`) already documents and handles this class of problem.

**Fix:** prefer a soft delete (`products.isActive = false`) so order history stays intact. If a hard
delete is really wanted, decide the rule explicitly — `onDelete: 'set null'` on `orderItems.productId`
plus a denormalised product name on the line item.

### M7. Date range start and end are parsed in different timezones

`dashboard/orders/+page.server.ts:41-42` and `dashboard/reports/+page.server.ts:54-55`:

```ts
start ? gte(orders.createdAt, new Date(start)) : undefined,              // '2026-08-01' → UTC midnight
end   ? lte(orders.createdAt, new Date(`${end}T23:59:59`)) : undefined,  // local time
```

A bare `YYYY-MM-DD` is parsed as UTC; a `YYYY-MM-DDTHH:mm:ss` string with no offset is parsed as
local. At UTC+3 the window silently starts three hours late.

**Fix:** build both ends the same way — `new Date(`${start}T00:00:00`)` and
`new Date(`${end}T23:59:59.999`)` — or keep them as strings and let MySQL do the comparison.
`currentMonthFilter` (`global.svelte.ts:175-182`) has the mirror-image problem: it parses `end` as
UTC then calls `setHours` in local time.

### M8. Supplying only `start` or only `end` returns 400

`dashboard/reports/+page.server.ts:26`, `products/single/[id]/ranges/+page.server.ts:18`,
`products/single/[id]/damaged/+page.server.ts:17`:

```ts
if ((startParam || endParam) && (!isValidDateString(startParam) || !isValidDateString(endParam)))
    error(400, 'Invalid date range');
```

`isValidDateString(null)` is `false`, so a one-sided range like `?start=2026-01-01` always errors
even though it's a reasonable request.

**Fix:** validate each side independently — reject only a param that is present *and* unparseable:

```ts
if ((startParam && !isValidDateString(startParam)) || (endParam && !isValidDateString(endParam)))
    error(400, 'Invalid date range');
```

Then let `currentMonthFilter` handle a missing side (it currently falls back to the whole current
month when only one is supplied, which is also worth fixing).

### M9. Account email changes bypass better-auth

`account/settings/+page.server.ts:106-112` writes `user.email` with a direct
`db.update(user).set({ name, email })`. better-auth owns that table and has its own
`changeEmail` flow with verification.

**Impact:** `emailVerified` stays `true` for an address that was never confirmed, and the reset-password
flow (`auth.ts:18`) will now mail a reset link to an unverified address. A user can point their account
at an address they don't control.

**Fix:** call `auth.api.changeEmail({ body: { newEmail }, headers })` and let better-auth run its
verification; keep the direct update for `customers`-table fields only.

### M10. Unawaited `sendEmail` can crash the process

`signup/+page.server.ts:82` — `sendEmail(email, subject, html);` — no `await`, no `.catch()`. If SMTP
is down the rejection is unhandled, which terminates a Node process by default. Note that
`checkout/+page.server.ts:104-115` and `orders/+page.server.ts:329-340` do attach `.catch()`, so this
one is an oversight rather than a pattern.

**Fix:** `sendEmail(...).catch((err) => console.error('Email Error (Welcome):', err));`

### M11. Stock adjustments record the quantity as the money amount

`dashboard/products/single/[id]/+page.server.ts:120-128`:

```ts
await tx.insert(transactions).values({ amount: String(adjustment), recieptLink, ... });
```

`adjustment` is a unit count, but `transactions.amount` is the currency column that
`reports` reads as `totalPaid`. The form already collects `costPerItem` (`schema.ts:44-46`) and it is
only ever folded into the free-text `reason` string.

**Fix:** `amount: String(costPerItem * quantity)`, and add real `costPerItem` / `employeeResponsible`
columns to `productAdjustments` rather than concatenating them into `reason`.

### M12. Order tracking step is always undefined

`account/orders/+page.server.ts:52` reads `row.currentStep`, but the select at lines 26-37 never
projects such a column and no `currentStep` exists in `schema.ts`. Every order is returned with
`currentStep: undefined`, so the tracking UI has nothing to key on. `svelte-check` flags this.

**Fix:** derive it from `orders.status` (`pending → 1`, etc.) or add the column and select it.

### M13. The 404 in `account/orders` never reaches the client

`account/orders/+page.server.ts:20` throws `error(404, 'Customer profile not found.')` from inside
the `try`, and the `catch` at line 77 swallows it and returns `{ pendingOrders: [] }`. A user with no
customer profile sees an empty order list rather than the intended error.

**Fix:** move the guard above the `try`, or re-throw redirects/errors:
`if (isHttpError(err) || isRedirect(err)) throw err;`

### M14. Root layout queries the database on every request

`src/routes/+layout.server.ts` runs four queries — `gallery`, `catalogManual`, `freeDelivery`, and a
role join — for **every** page load in the app, including the dashboard and API-ish routes that
never use `imagesList` or `files`.

**Fix:** move `imagesList`/`files`/`freeData` into the specific layouts or pages that render them, or
cache them in module scope with a short TTL since they change rarely. The related
`reports/+page.server.ts:120` `orderLevelRows` query is unbounded — it pulls every matching order
into memory to compute counts and breakdowns, which will degrade as order volume grows; those
aggregates belong in SQL `GROUP BY` queries.

---

## Low

### L1. 710 `svelte-check` errors, mostly implicit `any`

`npm run check` reports 710 errors / 160 warnings across 149 files; 372 are "implicitly has an `any`
type". The largest single cause is 10 imports of modules that do not exist — `src/lib/data/` is
absent entirely, so `import type { Recipe, Ingredient } from '$lib/data/recipes'` resolves to `any`
and poisons everything downstream.

These are **type-only** imports, so `vite build` still passes and nothing breaks at runtime — but the
type checker is effectively off for recipes, and it can't catch the kind of mistakes listed above.

**Fix:** create `src/lib/data/recipes.ts` exporting `Recipe`/`Ingredient` (or derive them from the
drizzle schema with `InferSelectModel<typeof recipes>`), then work the error count down. Two files
also import components that don't exist — `src/lib/components/nav/navbar.svelte` and
`src/lib/components/categories.svelte` are dead (nothing imports them) and can be deleted.

### L2. Login page reports "Sign Up Successful!"

`login/+page.server.ts:68` on success, and line 87 falls back to `'Registration Failed'` on error.
Copy-paste from the signup handler. **Fix:** "Signed in successfully" / "Login failed".

### L3. Wrong `$types` import path in signup

`signup/+page.server.ts:3` imports `Actions`/`PageServerLoad` from `'./login/$types'` instead of
`'./$types'`. Type-only, so it doesn't break the build, but the action and load are typed against a
different route. **Fix:** `from './$types'`.

### L4. SMTP port is passed as a string, `secure` is hardcoded

`src/lib/server/email.ts:5-13`. `$env/static/private` yields strings; nodemailer expects a numeric
`port`. `secure: true` is correct only for 465 — with 587 (STARTTLS) the connection will hang or
fail. **Fix:**

```ts
const port = Number(SMTP_PORT);
const transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: {...} });
```

Also add `@types/nodemailer` to devDependencies — it's the first `svelte-check` error.

### L5. Dead code

- `account/settings/+page.server.ts:43-45` and `:58-60` — the same `if (!singleUser)` check twice; the
  second is unreachable.
- `dashboard/+page.server.ts:17-18` — `today` is computed and never used (the query uses
  `CURRENT_DATE()` instead).
- `checkout/+page.server.ts:127` — `getPrice()` defined and never called (see C4), plus unused imports
  `addUser`, `loginSchema`, `and`, `sql`, `products`.
- `dashboard/+layout.server.ts:1-7` — `user`, `error`/`redirect` overlap, and `gte` imported unused.

### L6. `SvelteDate` used in server-side code

`global.svelte.ts` uses `SvelteDate` (from `svelte/reactivity`) inside `getCurrentMonthRangeDates`,
`getPresetDateRange`, and `currentMonthFilter` — all of which run in `+page.server.ts` load
functions. The reactive wrapper does nothing outside a component and only adds overhead.

**Fix:** plain `Date` in these helpers; keep `SvelteDate` for genuinely reactive component state.
Relatedly, `getPresetDateRange` does not validate its argument — an unknown `?preset=` value falls
through the switch and silently produces an all-time range instead of the intended `thisMonth`.

---

## Suggested order of work

1. ~~**C1** — the authorization hook. It is the single highest-leverage fix and it also closes the
   reachable path to M4.~~ ✅
2. ~~**C2, C3, C4** — the customer-facing order and checkout holes.~~ ✅
3. ~~**C5**~~ ✅, **H1** — the two credential-exposure paths. C5 is fixed, but **rotate the
   credentials it exposed** (see C5) — that part is not a code change.
4. **H2, H5, H7** — small, self-contained, and each one currently breaks a real admin workflow.
5. **H3, M5, M11** — data-correctness fixes; worth auditing existing rows after deploying.
6. **H4** — mechanical but touches ~40 files; do it in one pass with `svelte-check` as the checklist.
