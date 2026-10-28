# Bug Report — Lalo Bakery

This file holds two audits. The **2026-09-14 re-audit** comes first: new findings (IDs `N1`–`N38`)
plus an updated status for every item still open from the first audit. The **original 2026-08-10
audit** follows unchanged, below the second horizontal divider.

---

# Re-audit — 2026-09-14

Branch: `main` @ `07a5700` (plus an uncommitted change to `hero.svelte`, which wasn't reviewed)

Scope: the whole dashboard (`src/routes/dashboard/**`), customer account pages (`/account/**`),
`/orders`, `/checkout`, `/contact-us`, auth (`/login`, `/signup`, `/logout`, the password routes),
`hooks.server.ts`, `src/lib/server/*`, and the shared schemas. The shopping flow already has its own
report in `shoppingBugs.md`, so it isn't repeated here.

Method: I read the code and ran `svelte-check`, which now reports **658 errors and 164 warnings**
(down from 701). Several findings below come straight from its "Cannot find name" and "does not
exist" errors. Nothing was tested against a running server this time, so treat each failure
scenario as what the code does when you trace it, not as something observed live.

| Severity | New | Still open from 2026-08-10 |
| --- | --- | --- |
| Critical | 2 (**both fixed**) | — |
| High | 8 (**all fixed**) | H4 (partly), H5, H6 |
| Medium | 15 (**all fixed**, N11 mostly) | M3, M4, M6–M9, M12, M14 |
| Low | 13 (**all fixed**) | L1, L4, L5 (partly), L6 |

## Fix log — 2026-09-14

N1–N38 are fixed in the working tree (uncommitted). Nothing has been run against a live server:
the checks were `svelte-check` (now **505 errors**, down from 658, mostly from deleting the
duplicate recipes tree) and reading the code paths through.

**⚠️ Apply `drizzle/0020_parallel_shaman.sql` before deploying.** The dashboard's daily stats (N15)
and the order edit action read or write the new `orders.delivered_at` column and will error until it
exists. The migration also adds an index for the receipt lookup (N30), removes the duplicate
`'pending'` from the `payment_status` enum, and has two hand-written backfills: `delivered_at` from
`updated_at`, and `payment_status = 'paid'` for delivered orders that have a payment method. Delivered
orders that lost their payment method to N6 have no transaction row, so they can't be backfilled.
Re-enter those by hand if the numbers matter.

**Set `ADMIN_EMAIL` in `.env`** (N3). Until then, notifications go to `SMTP_USER`.

Decisions made while fixing, worth a second look:
- **N10:** a guest whose email belongs to a registered account is now told to sign in. Account-less
  customer rows are still reused.
- **N11:** products that have been deactivated are blocked at checkout, in `/checkout/prices`, on
  `/orders`, and in the reorder list. The **dashboard** order picker still lists them on purpose, so
  staff can edit an existing order that contains a now-inactive product.
- **N12:** quantity was removed from the product edit form. Stock now changes only through
  *Change Quantity*, which gained a Supplier field (N35).
- **N14:** with "all statuses" selected, Reports money figures (revenue, average, top products,
  trend, category and payment breakdowns) count **delivered** orders only. The order count and
  status chart still count every order, and the card captions say which scope is used.
- **N17:** editing a customer no longer touches the linked login's email. That belongs to
  better-auth's own flow (M9).
- **N22:** a free-delivery threshold of 0 now means "off" everywhere (server, checkout page, cart
  hint, staff dialog).
- **N30:** receipts are shown only to admins and to the customer who owns the order. Everything else
  under `/files` is still public.
- **N32:** removed `forgot-password/+page.server`, `dashboard/recipes/recipes/**`, and
  `dashboard/orders/{all-orders,cancelled,delivered}`. These removals are staged with `git rm`.
  `/change-password` was **kept**: it isn't dead, because the admin avatar menu links to it. The
  search palette's Recipes link now points at `/dashboard/recipes`.

Fixed along the way, from the first audit: **H3** (payments fan-out), **H7** (`?page=abc` on orders
and reports), **M1** (one shared `FILES_DIR`), **M2** (plus the same bug in logos), **M5**
(un-delivering now reverses the quantities that were actually deducted), **M11** (adjustment receipt
amount is now cost × quantity), **M13** (on `/account`; `/account/orders` is still open), **L2**, and
**H4** for the customer and product detail pages only.

Two new bugs turned up while fixing, and both are fixed:
- **N39.** `contact_messages.message` is `NOT NULL` but the form field is optional, so a contact
  message with an empty body failed to save. The action now stores `''`.
- **N40.** `damaged_products.reason` has the same mismatch, so marking stock damaged without a reason
  failed. The action now stores `''`.

---

## Critical

### N1. The customer detail page always shows the first customer, and saving overwrites the one in the URL — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/customers/[id]/+page.server.ts:26-41` (load), `:114-155` (`edit`)

```ts
const customer = await db
    .select({ id: customers.id, customerName: customers.name, ... })
    .from(customers)
    .leftJoin(user, eq(customers.createdBy, user.id))
    .then((rows) => rows[0]);          // ← no .where(eq(customers.id, Number(id)))
```

The query has no `WHERE`, so `rows[0]` is whichever customer MySQL returns first, usually the
lowest id. Every `/dashboard/customers/<id>` page shows that same customer's name, phone, email,
address and status. The order counts and the pending-order list underneath *are* filtered by `id`,
so the page mixes two different customers' data.

**Failure scenario:** an admin opens customer #57, sees customer #1's details in the edit form, fixes
a typo and saves. The `edit` action writes to `params.id`, which is #57. So #57 now has #1's name,
email and phone, and #57's original details are gone. If #57 has a login, the same action also sets
their `user.email` to #1's address (`:139-145`). That either fails the unique index or points #57's
account at someone else's inbox.

**Fix applied:** the load now filters on `customers.id` and returns a 404 for an unknown id (the
`catch` re-throws HTTP errors, so the 404 isn't swallowed). In `edit`, the account lookup runs on
`tx`, and the `user.email` sync is skipped for walk-in customers with no linked account. Still
open: N17 (the edit schema and the direct `user` write) and N24 (the unfiltered `allItems`).

### N2. `/account/history` sends every customer's order items to every signed-in customer — ✅ FIXED (2026-09-14)

**Where:** `src/routes/account/history/+page.server.ts:51-70`

```ts
const allItems = await db
    .select({ id: orderItems.id, orderId: orderItems.orderId, product: products.name, ... })
    .from(orderItems)
    .leftJoin(orders, and(eq(orders.id, orderItems.orderId), eq(orders.customerId, Number(customer.id))))
    .leftJoin(products, eq(orderItems.productId, products.id));   // ← no WHERE
```

This is the bug C3 fixed on `/orders`, copied into another route. A condition inside a `LEFT JOIN`
only decides which `orders` columns get filled in. It never removes `orderItems` rows, so the result
is the **entire `order_items` table**.

**Failure scenario:** any customer who opens *Account → History* receives every order line in the
shop: order ids, products, quantities and prices, serialized into the page data. It's visible in
dev tools even if the UI only renders their own. The payload also grows with every sale.

**Fix applied:** the query now uses the `/orders` pattern. It collects the customer's own order ids
from `allData`, filters with `inArray(orderItems.orderId, orderIds)`, and skips the query when there
are none. Not verified against a running server. The two admin-only copies (N24) are unchanged.

---

## High

### N3. Admin notification emails go to the server's OS login name, not to the shop — ✅ FIXED (2026-09-14)

**Where:** `src/routes/checkout/+page.server.ts:5,224`, `src/routes/contact-us/+page.server.ts:5,43`,
`src/routes/dashboard/orders/+page.server.ts:5,426`

```ts
import { USER } from '$env/static/private';
sendEmail(USER, adminCheckoutTemplate(...).subject, ...);
```

`.env` has no `USER` key. It has `SMTP_USER`, `SMTP_HOST`, and so on. `$env/static/private`
reads the whole process environment at build time, and `USER` is a standard Unix variable holding
the login name of whoever ran `vite build`, e.g. `nahu`, `root`, or `runner` in CI. That value gets
baked into the bundle.

**Impact:** the "new order", "new contact message" and "order delivered" admin emails go to
something like `nahu`, which isn't a valid address. nodemailer rejects it or the SMTP server bounces
it, and the `.catch` only logs the error. **The shop is never told about new orders or messages.**

**Fix:** add an explicit `ADMIN_EMAIL` to `.env` and `.env.example` and import that. Rename the
variable everywhere so it can't pick up an OS variable again.

### N4. Creating a user from the admin panel always fails, and the attempt logs the password — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/admin-panel/users/add-users/+page.server.ts:29,47-60`

Three separate problems in one action:

1. **`auth.api.createUser` doesn't exist.** It comes from better-auth's `admin` plugin, and
   `src/lib/server/auth.ts` only registers `sveltekitCookies`. `svelte-check` reports
   `Property 'createUser' does not exist`. At runtime the call throws `TypeError: ... is not a
   function`, so the admin sees `Registration Failed…` every time. **No user can be created.**
2. **`console.log(form)`** on line 29 runs before anything else and prints the whole superform,
   including `data.password` in plain text, to the server log on every attempt.
3. Once (1) is fixed, **H2 comes back**: `roleId: 1` is still hardcoded, so every new user becomes
   an Admin whatever role was picked.

The schema (`add-users/schema.ts:6`) also has no minimum length on `password`.

**Fix:** delete the `console.log`. Create the user with `auth.api.signUpEmail` (as `/signup`
does), or add the `admin()` plugin to `auth.ts`. Then `set({ roleId: role })` after checking that
`role` exists in `roles`, and add `.min(8)` to the password field.

### N5. Payment status is never set, so every "payments collected" figure is 0 — ✅ FIXED (2026-09-14)

**Where:** `transactions.paymentStatus` (`src/lib/server/db/schema.ts:89-99`, default `'pending'`);
read at `src/routes/dashboard/+page.server.ts:54` and `src/routes/account/+page.server.ts:43-47`

`grep` finds no place in the app that ever writes `paymentStatus`. Every transaction, including
ones with a receipt on delivered orders, stays `'pending'` forever.

**Impact:**
- The dashboard's **"Payments Collected"** card only sums `paid`/`partially_paid`/`overpaid`, so it
  always shows **ETB 0**. H3's fan-out bug is currently hidden because the sum is always zero.
- On the customer's `/account` page, **Total Spent is always 0** and every order they've paid for
  counts toward **Outstanding**.

The enum also lists `'pending'` twice (`schema.ts:90-91`).

**Fix:** set `paymentStatus: 'paid'` when a delivered order is saved with a payment method (see
N6), or give staff a status picker. Then backfill existing delivered orders that have a receipt.

### N6. Marking an order delivered throws away the payment method unless a receipt is uploaded — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/orders/+page.server.ts:299-351`

The action insists on a payment method for delivered orders (`:299`), but it only creates or
updates a `transactions` row inside `if (reciept) { ... }`. With no receipt file, `paymentMethod`
is validated and then never stored.

**Failure scenario:** a cash-on-delivery order gets marked delivered with method "Cash" and no
receipt. The order saves with no transaction. It shows as "Unpaid / No Method" in Reports, and the
orders filter by payment method never finds it. A receipt uploaded later still won't fix the
method on orders already saved this way.

Two related problems in the same block:
- `transactions.amount` is `getTotal(selectedProducts)`, which **leaves out the delivery `fee`**.
  Every recorded payment is short by the fee.
- If items change on an order that already has a transaction, but no new receipt is uploaded,
  `amount` isn't updated.

**Fix:** upsert the transaction whenever `paymentMethod` is set, store `recieptLink` only when a
file was uploaded, and set `amount` to subtotal + `fee`.

### N7. The contact form lets anyone send HTML email in the shop's name to any address — ✅ FIXED (2026-09-14)

**Where:** `src/routes/contact-us/+page.server.ts:42-50`, `src/lib/server/email.ts:231-310`

`customerContactTemplate(name, subject)` drops `name` and `subject` into HTML unescaped and sends
it to whatever `email` the visitor typed. There's no auth, no rate limit and no captcha.

**Failure scenario:** a script POSTs `?/contact` with `email=victim@example.com`,
`name=<a href="https://evil.example">Click to confirm your order</a>`. The victim gets a real
email from the bakery's SMTP account with Lalo branding and the attacker's link. Repeat that
thousands of times and the SMTP account gets blacklisted. `adminContactTemplate` has the same
injection, aimed at staff.

**Fix:** HTML-escape every interpolated value in `email.ts`. Don't echo user-supplied text in the
auto-reply, or drop the auto-reply entirely. Add rate limiting, or a honeypot or captcha, to the
contact action.

### N8. Editing a user's email crashes, and deleting a user always ends in a 500 — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/admin-panel/users/[id]/+page.server.ts:88`, `:118-135`

- `editUser` calls `setError(...)` on the duplicate-email branch, but `setError` is never imported
  (`svelte-check`: `Cannot find name 'setError'`). The `ReferenceError` is caught and shown as
  "User Update Failed setError is not defined", so the message never says the email is taken.
- `delete` references an undefined `err` in its `!id` branch and an undefined `form` in its `catch`
  (`Cannot find name 'form'`). A failed delete throws a second `ReferenceError` from inside the
  `catch`, which becomes an unhandled 500. Deletes do fail in practice: `customers.user_id`
  references `user.id` with no `onDelete`, so deleting any user who has a customer profile trips
  the FK.
- There's also no guard stopping an admin from deleting or demoting themselves or the last Admin,
  which would lock everyone out of `/dashboard`.

**Fix:** import `setError`. Rewrite the `delete` catch to `setFlash` + `fail(400)` with no `form`.
Refuse to act on `locals.user.id` or on the last Admin. Decide what should happen to a deleted
user's customer row (probably `user_id = NULL`, matching the standalone-customer model).

### N9. Deleting a customer succeeds but reports an error — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/customers/[id]/+page.server.ts:156-177`,
`src/routes/dashboard/customers/[id]/history/+page.server.ts:137-158`

```ts
await db.delete(customers).where(eq(customers.id, id));
setFlash({ type: 'success', message: 'Customer Deleted Successfully!' }, cookies);
return message(form, { ... });      // ← `form` is not defined anywhere in this action
```

The row is deleted, then `message(form, …)` throws `ReferenceError: form is not defined`. The
`catch` overwrites the success flash with `Unexpected Error: form is not defined`, so the admin is
told the delete failed. The stale page makes it look like the customer still exists. The
`!id` branch also references an undefined `err`.

Separately, a customer with any orders can't be deleted at all (`orders.customer_id` has no
`onDelete`), and the admin gets a raw FK error instead of an explanation.

**Fix:** drop the `message(form…)` line and redirect to `/dashboard/customers` after the flash.
Catch `ER_ROW_IS_REFERENCED_2` and say "this customer has orders", or soft-delete through
`isActive`.

### N10. Guest checkout can place orders on a registered customer's account — ✅ FIXED (2026-09-14)

**Where:** `src/routes/checkout/+page.server.ts:248-276` (`findOrCreateGuestCustomer`)

A guest order looks up `customers` by the email the guest typed and reuses that row if it exists.
The comment says this was chosen on purpose to avoid a unique-key collision. The effect is that
anyone who knows a customer's email can, without signing in, create orders that:
- show up in that customer's `/account`, `/account/orders` and `/account/history`,
- arrive in the dashboard under that customer's name and phone number, with an address the
  attacker chose, and
- trigger a confirmation email to the real customer.

That's a harassment and fake-order vector, and staff can't tell such orders apart from real ones.

**Fix:** only reuse an existing row when it's account-less (`user_id IS NULL`). When the email
belongs to a registered account, return "An account exists for this email, please sign in" and
don't create the order.

---

## Medium

### N11. Inactive products can still be ordered — ⚠️ MOSTLY FIXED (2026-09-14)

**Where:** `src/routes/checkout/+page.server.ts:292-325`, `src/routes/checkout/prices/+server.ts:42-45`,
`src/routes/orders/+page.server.ts:37-52`, `src/routes/dashboard/orders/+page.server.ts:67-94`

The recent "inactive products" feature only hides products from the shop grid and product page.
None of these check `products.isActive`: checkout's `resolveLineItems`, the `/checkout/prices`
endpoint, the `/orders` product and price pickers, or the dashboard order picker.

**Failure scenario:** a product is deactivated while it sits in someone's cart (`localStorage`). The
price check still returns it, so checkout accepts it and the order goes through. Staff also still see
deactivated products in the "new order" picker, and in the dashboard's "Products to Reorder" list
(`dashboard/+page.server.ts:9-15`).

**Fix:** `innerJoin(products, …)` and add `eq(products.isActive, true)` in each of these queries.

### N12. Product edit can't save a product with 0 stock, and overwrites stock without a ledger entry — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/products/single/[id]/schema.ts:20-31`,
`add-products/schema.ts:20-31`, `single/[id]/+page.server.ts:40-65`

- `quantity` and `reorderLevel` use `.positive()`, which rejects `0`. **An out-of-stock product
  can't be edited at all.** Renaming it or changing its category fails with "Quantity must be a
  positive number", because the form resubmits the current quantity of 0. The same rule stops staff
  from adding a new product with zero opening stock or no reorder level.
- `editProduct` writes `quantity` straight to `products.quantity`. That bypasses the
  `productAdjustments` ledger the rest of the app keeps. It also races deliveries: an admin opens the
  edit dialog showing 50, an order is delivered (stock 40), the admin saves a description change, and
  stock goes back to 50 with no record of why.
- `supplierId: supplier ? supplier : 1` quietly assigns supplier #1 whenever the field is left empty.

**Fix:** use `.nonnegative()`. Remove `quantity` from the edit form, since stock should only change
through the Adjust dialog. Write `supplierId: supplier ?? null`.

### N13. Editing a delivered order's items, or deleting a delivered order, leaves stock wrong — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/orders/+page.server.ts:380-405` (edit), `:447-466` (delete)

Stock only moves when an order crosses the `delivered` boundary. If a delivered order stays
delivered while its items change (10 units → 4), the six units never come back into stock. Deleting
a delivered order removes its items but doesn't reverse the deduction either. (M5 covers the related
case where status and items change in one save.)

**Fix:** when the order is delivered before and after the save, compute the per-product difference
between the old and new `orderItems` and adjust by that. When deleting a delivered order, reverse
its adjustments inside the same transaction.

### N14. Reports count cancelled and pending orders as revenue by default — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/reports/+page.server.ts:42-43,52-67`

`status` defaults to `'all'`. **Total Revenue, Items Sold, Average Order Value, Top Products, the
trend chart and the category breakdown** therefore include cancelled orders, which never earned
anything, and pending orders, which haven't earned anything yet. When the category filter is on, the
payment breakdown also adds each order's whole `transactions.amount`, not just the matching
category's share.

**Fix:** default the revenue aggregates to `status = 'delivered'` while leaving the order table's
filter as it is, or label the cards "Order value (all statuses)".

### N15. "Today's" dashboard stats use the order's creation date, not its delivery date — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/+page.server.ts:66-72`

The daily card filters on `status = 'delivered' AND createdAt is today`. An order placed yesterday
and delivered today doesn't count. One placed today and delivered next week never shows up on any
day's card. `CURRENT_DATE()` also uses the database server's timezone. If that's UTC, the "day"
runs from 03:00 to 03:00 Addis Ababa time.

**Fix:** record a `deliveredAt` timestamp, or use `productAdjustments.createdAt` for the "Order #x
delivered" rows, and filter on that using an explicit `+03:00` boundary.

### N16. The delivery-area edit handles duplicate names backwards — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/delivery-address/+page.server.ts:86-95`

```ts
} catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') return;                     // duplicate → returns nothing
    setError(form, 'name', 'Delivery Addressname already exists.'); // every other error → "already exists"
```

When a rename collides with an existing area, the action returns `undefined`. The dialog gets no
form back, so nothing visibly happens. Any other error, such as a DB outage or a bad fee, is
reported as a duplicate name.

**Fix:** `if (err.code === 'ER_DUP_ENTRY') return setError(form, 'name', 'Delivery area already exists.');`
and let the generic message handle everything else.

### N17. Customers without an email can't be edited, and edits bypass better-auth — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/customers/[id]/schema.ts:8,13`, `[id]/+page.server.ts:126-146`

- The edit schema requires `email: z.email()` and `address`. Walk-in customers are created
  deliberately with `email = NULL` (`customers/+page.server.ts:62-67`), so **they can never be
  edited**. Every save fails validation until someone invents an email address for them.
- `deliveryAddress` isn't in the edit schema at all.
- The phone number isn't normalised here or in `addCustomer`, while signup, checkout and contact
  all store `+251XXXXXXXXX`. The same person ends up as `0912…` in one row and `+251912…` in another.
- The action writes `user.email` directly, with the same problems as M9.

**Fix:** make `email` and `address` optional (use `''` → `null` as `addCustomer` does), add
`deliveryAddress`, run `normalizeEthiopianPhone`, and drop the direct `user` update.

### N18. Order history shows the customer's signup date as every order's date — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/customers/[id]/+page.server.ts:66`,
`dashboard/customers/[id]/history/+page.server.ts:57`, `account/history/+page.server.ts:45`

```ts
createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%Y-%m-%d')`,   // selected from `orders`
```

Every order row in these three lists shows the date the customer was created, not the date the
order was placed.

**Fix:** use `orders.createdAt`.

### N19. Testimonials can't be edited without re-uploading the avatar — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/testimonials/schema.ts:27-30`, `+page.server.ts:85`

`editPaymentMethod.avatar` is a required `File`, and the action always calls
`saveUploadedFile(avatar)`. To fix a typo in a testimonial, the admin has to upload the photo again,
or the save fails validation. The schema also accepts `application/pdf` as an avatar, and the
validation messages say "Name of Payment Method is required" (the schema was copied from the payment
methods page).

**Fix:** make `avatar` optional in the edit schema, only replace it when
`avatar instanceof File && avatar.size > 0` (as `crud.ts:115` does), and remove PDF from the accepted
types.

### N20. `/account` shows customers the shop's pending-order and unread-message counts — ✅ FIXED (2026-09-14)

**Where:** `src/routes/account/+layout.server.ts:16-26`

This layout was copied from the dashboard layout. It counts **every** pending order and **every**
unread contact message in the database and returns both to any signed-in customer. That leaks
business volume, and the numbers mean nothing to the customer.

**Fix:** delete both queries, or scope `ordersNumber` to the customer's own `customers.id`.

### N21. Negative delivery fees and prices are accepted — ✅ FIXED (2026-09-14)

**Where:** `dashboard/delivery-address/schema.ts:5,12`, `products/single/[id]/schema.ts:84,91`

`fee: z.number()` and `price: z.coerce.number()` have no lower bound, and `amount` has no minimum
length. A typo like `-50` makes every delivery to that area *subtract* 50 from the order total, or
lists a product variant at a negative price with a blank label.

**Fix:** `.nonnegative()` for fees, `.positive()` for prices, and `.min(1)` on the variant label.

### N22. Saving free-delivery settings can wipe them or make every delivery free — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/delivery-address/+page.server.ts:98-121`, `schema.ts:17-20`

- `db.delete(freeDelivery)` and the following `insert` run outside a transaction. If the insert
  fails, the settings are simply gone.
- Both fields `.default(0)`. Saving with an empty threshold stores `0`, and
  `resolveDeliveryFee` then treats every order as `subtotal >= 0`, so **all deliveries become free**.
- `console.log('form', form)` is left in on line 100.

**Fix:** wrap both statements in `db.transaction`, require `threshold > 0` (or treat 0 as
"disabled" in `resolveDeliveryFee`), and remove the log.

### N23. Staff-created orders take prices from the browser — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/orders/+page.server.ts:243-251,366-377,474-495`

C4 and H8 made checkout and `/orders` re-read prices from the database. The dashboard `add` and
`edit` actions still parse the price out of the posted `"<price> <label>"` string
(`splitNumbers`), and base the delivery fee on that same total. Only admins can reach this, so it
isn't a security hole. It does mean an edited or stale dialog writes whatever price the browser
sent, even if it matches no `prices` row.

**Fix:** post the `prices.id` (as checkout does) and resolve price and label on the server.

### N24. The admin customer pages load the entire order-items table — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/customers/[id]/+page.server.ts:72-91`,
`dashboard/customers/[id]/history/+page.server.ts:63-82`

This has the same `LEFT JOIN`-that-filters-nothing shape as N2. It's admin-only, so it's not a leak,
but every customer page loads every order line in the shop, and it gets slower with every sale.

**Fix:** as N2, filter with `inArray(orderItems.orderId, orderIds)`.

### N25. The history page's customer edit writes columns that don't exist — ✅ FIXED (2026-09-14)

**Where:** `src/routes/dashboard/customers/[id]/history/+page.server.ts:105-136`,
`src/lib/ZodSchema.ts:313-325`

`editCustomer` validates `firstName`, `lastName` and `gender`, then writes them to `customers`,
which only has `name`. Drizzle quietly ignores unknown keys, so only `phone` is saved and the admin
still sees "Customer updated Successfully Added". The page also imports `PageServerLoad` from
`'../$types'` (the parent route).

**Fix:** delete this action and its schema. `customers/[id]` already has the working edit.

---

## Low

### N26. The logo and catalog uploads skip validation — ✅ FIXED (2026-09-14)

`dashboard/logos/+page.server.ts:23-26` and `dashboard/catalog/+page.server.ts:25-30` never check
`form.valid`. In logos, a bad submission leaves `existing` undefined and `existing.split(',')` throws,
the same bug as M2. `logos/schema.ts` and `catalog/schema.ts` use a bare `z.file()` with no type
check, so any file type is accepted. `catalog` also has two `console.log`s. **Fix:** add the
`form.valid` guard and restrict MIME types (images for logos, PDF for the catalog and manual).

### N27. A recipe edit can't remove every ingredient — ✅ FIXED (2026-09-14)

`dashboard/recipes/single/[id]/+page.server.ts:155-163` only deletes and reinserts ingredients
`if (ingredients.length > 0)`. If you clear the list, the old ingredients stay. **Fix:** always
delete, and insert only when the list isn't empty.

### N28. Order emails show product ids instead of names — ✅ FIXED (2026-09-14)

`email.ts` `generateOrderTable` renders `Product #${item.product}`, and checkout passes `productId`.
The customer's confirmation email reads "Product #42 (500g)". **Fix:** include `products.name` when
resolving line items and pass it to the template.

### N29. The customers table's "Order Counts" only counts pending orders — ✅ FIXED (2026-09-14)

`dashboard/customers/+page.server.ts:29` joins orders with `status = 'pending'`, but the column is
labelled "Order Counts" (`customers/columns.ts:86-90`). **Fix:** count all orders, or rename the
column to "Pending Orders".

### N30. Uploaded payment receipts are public — ✅ FIXED (2026-09-14)

`/files/[name]` serves anything in `FILES_DIR` to anyone, and that includes transaction receipts,
which are bank-transfer screenshots with names and account numbers. The UUID filenames make them
hard to guess, but a link that leaks (forwarded email, browser history) stays valid forever.
**Fix:** save receipts to a separate directory served by a route that checks the viewer is an admin
or the order's owner.

### N31. The recent-orders list on `/account` can cut an order's items short — ✅ FIXED (2026-09-14)

`account/+page.server.ts:77-78` applies `.limit(15)` to the flattened order×item rows. If an order
has more lines than fit, the list shows it with some items missing. Discounts are also listed
without checking `isActive` (`:106-116`). **Fix:** limit on order ids in a subquery first, then load
those orders' items.

### N32. Dead and duplicate routes — ✅ FIXED (2026-09-14)

- `src/routes/forgot-password/+page.server` has no `.ts` extension, so SvelteKit never loads it,
  which is lucky: it imports modules that don't exist (`$lib/server/updatePassword`,
  `sendResetPasswordEmail`). The page uses `authClient` instead. Delete the file.
- `src/routes/dashboard/recipes/recipes/**` is a near-exact duplicate of `dashboard/recipes/**`,
  reachable at `/dashboard/recipes/recipes/...`.
- `/change-password` duplicates `/account/settings/change-password` line for line.
- The `logout` action in `dashboard/+page.server.ts:81-88` is unused now that `/logout` exists.
- `dashboard/orders/all-orders/+page.server.ts` returns 404 on load, but its `+page.svelte`
  (194 lines) is still in the tree. The same goes for the sibling `cancelled/` and `delivered/`
  routes.

### N33. Leftover `console.log` calls with form data — ✅ FIXED (2026-09-14)

`delivery-address/+page.server.ts:100`, `catalog/+page.server.ts:30,36`,
`recipes/add-recipes/+page.server.ts:25`, `recipes/single/[id]/+page.server.ts:112`. They contain
no secrets, unlike N4, but they fill the production log. **Fix:** remove them.

### N34. Uploads can be orphaned or turn into an unhandled 500 — ✅ FIXED (2026-09-14)

`add-products/+page.server.ts:68-107` saves files *inside* the transaction and has no `try/catch`.
If the insert fails, the files stay on disk and the admin gets a 500 page, not a form message. The
`message(form, …)` call on line 119, just before `redirect`, does nothing. **Fix:** upload before the
transaction, wrap it in `try/catch`, and delete the uploaded files if the transaction fails.

### N35. Adjustments never record a supplier, so the supplier filter is always empty — ✅ FIXED (2026-09-14)

`productAdjustments.supplierId` is never written by the `adjust` action
(`single/[id]/+page.server.ts:131-137`), but `ranges/+page.server.ts:30,54-58` filters and builds
options from it. The dropdown is always empty. **Fix:** add a supplier field to the Adjust dialog, or
remove the filter.

### N36. The login action returns 500 for a bad form — ✅ FIXED (2026-09-14)

`login/+page.server.ts:35` and `signup/+page.server.ts:53` return `status: 500` for invalid input, and
login still says "Sign Up Successful!" and "Registration Failed" (L2). **Fix:** return 400 and use
login wording.

### N37. Staff add-customer doesn't check for duplicate phone numbers — ✅ FIXED (2026-09-14)

`customers/+page.server.ts:77-80` maps a duplicate-key error on `phone` to a field error, but
`customers.phone` has no unique index, so that branch never runs. With N17's missing normalisation,
the same walk-in customer gets added again and again. **Fix:** normalise the phone number and either
add a unique index or check for an existing row before inserting.

### N38. Password reset only logs the event — ✅ FIXED (2026-09-14)

`auth.ts:24-26` `onPasswordReset` only logs, and `sendResetPassword` awaits `sendEmail` without a
`catch`. An SMTP failure comes back to the client as a generic better-auth error with no log line
identifying the cause. **Fix:** wrap the call in `try/catch` and log with context.

---

## Status of items still open from the 2026-08-10 audit

Checked against `07a5700`:

| ID | Status | Note |
| --- | --- | --- |
| H1 | ✅ Fixed | `db/index.ts` no longer logs `DATABASE_URL`. |
| H2 | ✅ Fixed | Fixed with N4: the selected role is validated and saved. |
| H3 | ✅ Fixed | Payments are summed in their own query (with N15). |
| H4 | ⚠️ Partly | Customer and product detail pages fixed; order dialogs and the other ~35 components still assign at the top level. |
| H5 | ❌ Open | `roles/[id]/+page.server.ts:56-108` is still commented out. |
| H6 | ❌ Open | `signup/+page.server.ts:65-83`. |
| H7 | ✅ Fixed | Orders and reports now fall back to page 1. |
| M1 | ✅ Fixed | `FILES_DIR` exported from `upload.ts` and used by `/files`. `.env.example` now lists the email keys but still not `FILES_DIR`. |
| M2 | ✅ Fixed | Product gallery and logos both check `form.valid`. |
| M3 | ❌ Open | `single/[id]/+page.server.ts:37`; same pattern in recipe edit. |
| M4 | ❌ Open | `editPrice`/`deletePrice` still unscoped; `editPrice` still sets `id`. |
| M5 | ✅ Fixed | Stock changes are computed from the previous items (with N13). |
| M6 | ❌ Open | Hard delete; a soft-delete path now exists (`bulkDelete`) but the single-product delete wasn't switched to it. |
| M7 | ❌ Open | `dashboard/orders:45-46`, `reports:54-55`, `currentMonthFilter`. |
| M8 | ❌ Open | `reports:26`, `ranges:18`, `damaged:17`. |
| M9 | ❌ Open | Also in `admin-panel/users/[id]` and `customers/[id]` (N17). |
| M10 | ✅ Fixed | Done as H9. |
| M11 | ✅ Fixed | Amount is `costPerItem × quantity`. |
| M12 | ✅ Fixed | 2026-09-15: the unused `currentStep` field was removed (S-series fix log). |
| M13 | ✅ Fixed | `/account` on 2026-09-14, `/account/orders` on 2026-09-15. |
| M14 | ❌ Open | |
| L1 | ❌ Open | 658 errors / 164 warnings. |
| L2 | ✅ Fixed | With N36. |
| L3 | ✅ Fixed | |
| L4 | ❌ Open | `email.ts:7-8`. |
| L5 | ⚠️ Partly | Checkout imports are now used; `dashboard/+page.server.ts:17-18` `today` still unused. |
| L6 | ❌ Open | 15 `SvelteDate` uses in `global.svelte.ts`. |

## Suggested order of work (re-audit)

1. ~~**N1–N38**~~ ✅ fixed. Apply migration `0020` and set `ADMIN_EMAIL` (see Fix log).
2. **N3**: until it's fixed the shop gets no order notifications. Add `ADMIN_EMAIL`.
3. **N4, N8, N9**: admin-panel actions that crash. They're small, and `svelte-check` already points at
   each line.
4. **N5, N6**: payments, done together. Afterwards, backfill `paymentStatus`/`paymentMethodId` for
   past delivered orders and revisit H3.
5. **N7, N10**: the two unauthenticated abuse paths.
6. **N11–N17**, then the remaining open items from the first audit (H4 and H5 first).

---
---

# Original audit — 2026-08-10

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
