# Shopping Flow Bug Report — Shop, Product Page, Cart, Checkout

Audit date: 2026-08-10 · Branch: `main` @ `ee513a4` (+ uncommitted C4/C5/H9 fixes)

**Scope:** `src/routes/shop/**`, `src/routes/checkout/**`, `src/lib/hooks/cart.svelte.ts`,
`src/lib/components/product-card.svelte`, `src/lib/components/product-detail.svelte`,
`src/lib/components/floating-cart/**`.

**Method:** code reading, plus live verification against a dev server on port 5199 with the real
`lalo` database (125 active products, 216 price rows, 4 categories) — HTTP probes, decoded
`__data.json` payloads, a real browser session for the client-side behaviour, and real orders placed
and then deleted. Findings marked **VERIFIED** were reproduced; the rest are code-level reads and
are labelled as such. All probe rows were removed afterwards (user 7, customers 6, orders 6,
order_items 6 — the original counts).

Separate from `bugs.md`, which covers the whole app. IDs here are `S1…`.

| Severity | Count | Fixed | What it means |
| --- | --- | --- | --- |
| Critical | 3 | **3 — all fixed** (S1, S2, S4) | The customer is charged the wrong amount, or cannot check out |
| High | 9 | **9 — all fixed** (S5–S10, S13, S35, S36) | Products invisible, prices wrong on screen, cart silently corrupted |
| Medium | 12 | 4 (S11, S12, S14, S20) | Wrong or misleading UI, avoidable server load, missing guards |
| Low | 8 | 2 (S28, S29) | Dead code, cosmetics, polish |
| Retracted | 2 | — | **S3** (intended design) and **S15** (works as built) |
| Data | 6 | — | Bad rows in the database, not code — but they break the code above |

> **Read S1 and S2 first.** Between them, a customer could not check out at all if they picked two
> variants of one product, and — for eight products — was billed a different price than the one they
> clicked.
>
> **Two findings were retracted after review: S3 and S15.** S3 described the catalogue card's
> missing price and add-to-cart as a defect; it is a deliberate client decision and the change has
> been reverted. S15 was simply wrong. Both are kept below, struck through, with what was actually
> established.

**Fixed on 2026-08-10**, in six passes, each verified in a real browser and end-to-end through the
database: S1 · the S2 cluster (S2 + S4 + S7 + S8) · pagination (S5 + S6 + S20) · totals and
quantities (S13 + S14 + S35 + S9 + S10) · product-route 404s (S11 + S12). **Every Critical and every
High finding is fixed**, along with the Medium items that produced 500s or wrong totals.

Along the way **S36** was discovered — nobody in the "Bole" delivery area could check out at all —
and fixed, and **two findings were retracted**: S3 (the catalogue card is intentionally price-less;
that change was reverted) and S15 (it works as built).

What remains is Medium and Low: mostly UI polish (S16–S19, S21–S24) plus the **data issues**, of
which the eight duplicate `amount` rows matter most — they are why two packages of the same product
still read identically on screen, even though they are now priced correctly.

`vite build` passes; `svelte-check` is down from 701 errors to 690.

---

## Critical

### S1. The checkout page crashes and renders empty if the cart holds two variants of one product — ✅ FIXED (2026-08-10)

**Where:** `src/routes/checkout/+page.svelte:298`

```svelte
{#each cart.items as item (item.productId)}
```

The cart's own identity is `(productId, amount)` — that is the whole point of the variant selector,
and `cart.svelte` correctly keys on `(item)`. Only the checkout summary keys on `item.productId`
alone. Two lines for the same product therefore produce two identical keys, which is a **fatal**
error in Svelte 5, not a warning.

**Failure scenario:** a customer adds a 1 kg pack and a 500 g pack of the same product and clicks
Checkout. Hydration throws, so the page never finishes mounting: no contact form, no order summary,
no submit button.

**VERIFIED** — seeded the cart with two variants of product 39 and loaded `/checkout`:

```
[EXCEPTION] Svelte error: each_key_duplicate
Keyed each block has duplicate key `39` at indexes 0 and 1
  at src/routes/checkout/+page.svelte:698:16
```

The rendered page showed "Order Summary — **0 Items**" and an empty Contact Information card.
Clicking the floating cart button afterwards froze the renderer entirely (screenshot capture timed
out twice).

**Fix:** key on the same tuple the cart uses.

```svelte
{#each cart.items as item (`${item.productId}-${item.amount}`)}
```

Better, once S2 is fixed, key on `item.priceId`. Grep for other keyed blocks over `cart.items`
before closing this out — `cart.svelte:59` uses `(item)`, which works but is fragile.

**Resolution:** added an exported `cartKey(item)` to `cart.svelte.ts` — now `String(item.priceId)`
after S2 — and used it in *both* keyed blocks over `cart.items`, so the two can't drift apart again.

**VERIFIED:** reloaded `/checkout` with the same two-variant cart that produced the crash. The page
renders both lines (1 × 1400.00 and 2 × 950.00, total 3300.00), the contact form and submit button
are present, and `read_console_messages` reports **no errors or exceptions** on a fresh load.

---

### S2. A variant cannot be identified, so the customer is billed for the wrong one — ✅ FIXED (2026-08-10)

**Where:** the data model (`prices` has no unique key on `(product_id, amount)`),
`src/lib/hooks/cart.svelte.ts:69`, `src/routes/checkout/+page.server.ts` (`resolveLineItems`),
`src/routes/orders/+page.server.ts` (same helper).

The cart identifies a line by `(productId, amount)`, and after the C4 fix the **server re-prices by
the same pair**. But `amount` is not unique per product. Eight products have two price rows with a
byte-identical `amount`:

```
product 39  'Topping Chocolate 1kg'          → 1400.00 and 950.00
product 41  'Topping Chocolate 1kg'          → 1400.00 and 950.00
product 62  'Sugar-paste Color Assorted 1kg' →  800.00 and 850.00
product 63  'Sugar-paste Color Assorted 1kg' →  800.00 and 850.00
product 134 'Measuring Cup Set'              →  500.00 and 300.00
product 135 'Measuring Cup Set'              →  500.00 and 300.00
product 136 'Measuring spoon Set'            →  350.00 and 250.00
product 137 'Measuring Spoon Set'            →  350.00 and 250.00
```

Two independent failures follow:

1. **The cart merges two different packages into one line.** `addItem` matches on
   `(productId, amount)`, finds the existing line, and just increments its quantity — keeping the
   price of whichever was added first.
2. **The server resolves to the wrong row.** `variants.find(v => v.productId === id && v.amount === amount)`
   returns the *first* matching row. For product 39 that is `prices.id = 109` at 1400.00, always.

**VERIFIED, both halves.**

In a real browser, on `/shop/single/39`: clicked the **1400** package → Add to Cart, then clicked the
**950** package → Add to Cart. Resulting cart:

```json
[{"productId":39,"productName":"Topping Chocolate 1kg","price":1400,"amount":"Topping Chocolate 1kg","quantity":2}]
```

One line, quantity 2, at 1400 — the 950 package the customer explicitly selected does not exist in
the cart. They pay 2800 instead of 2350.

End-to-end through checkout, posting the 950.00 selection as a real signed-in customer:

| | value |
| --- | --- |
| package the customer selected | **950.00** |
| `order_items.price` written | **1400.00** |

A silent 47% overcharge, recorded in the order and in the confirmation email.

**Note this is partly a consequence of the C4 fix**, and it is not an argument for reverting it —
before C4 the server took the browser's number, which was wrong in the other direction. The real
defect is that nothing in the request identifies *which* variant was chosen.

**Fix — carry the primary key, don't reconstruct identity from a label:**

1. Add a `UNIQUE (product_id, amount)` constraint to `prices` so this cannot recur, after
   reconciling the eight rows above (see Data section).
2. Include `prices.id` everywhere a variant travels:

```ts
// cart.svelte.ts
export type CartItem = {
    productId: number;
    priceId: number;        // ← the variant's primary key
    productName: string;
    amount: string;
    price: number;
    quantity: number;
};

// identity becomes the variant itself
const existingIndex = this.items.findIndex((i) => i.priceId === item.priceId);
```

3. Have the shop and detail loads select `prices.id` into `priceList`.
4. Server side, look up by primary key and take everything else from the row:

```ts
const variants = await db
    .select({ id: prices.id, productId: prices.productId, amount: prices.amount, price: prices.price })
    .from(prices)
    .where(inArray(prices.id, selectedProducts.map((p) => Number(p.priceId))));

const variant = variants.find((v) => v.id === Number(item.priceId));
if (!variant) throw new Error(`Unknown variant ${item.priceId}`);
return { productId: variant.productId, quantity: Number(item.quantity), amount: variant.amount, price: variant.price };
```

This also removes the label-splitting in `/orders` (`variantLabel()`), letting both routes share one
helper — the unification noted at the end of C4 in `bugs.md`.

**Migration note:** carts already in customers' `localStorage` have no `priceId`. Version the stored
payload (`{ v: 2, items: [...] }`) and drop anything older on load, or fall back to the
`(productId, amount)` match when `priceId` is absent.

**Resolution:** `priceId` now travels end-to-end.

- `cart.svelte.ts` — `CartItem.priceId` added; `addItem`/`removeItem`/`updateQuantity` all key on it;
  `cartKey` is the variant id. Storage is versioned `{ version: 2, items: [...] }` and a v1 cart is
  **discarded** rather than migrated — a v1 line names a variant ambiguously, so there is no honest
  way to price it. Each line is also validated on load (`isValidCartItem`) instead of trusting
  whatever JSON was in `localStorage`.
- Both loads select `prices.id` into `priceList`; the detail page orders variants by price so
  "first" is the cheapest rather than arbitrary.
- `checkout/schema.ts` gained a required `priceId`; `+page.svelte` sends it.
- `resolveLineItems` looks up `inArray(prices.id, …)` and takes **`productId` from the variant row
  too**, so a payload pairing one product's id with another product's variant can't mislabel an
  order.

**VERIFIED — the client half**, in a real browser on `/shop/single/39`, repeating the exact sequence
that used to merge: clicked the **1400** package → Add, then the **950** package → Add.

```json
{"version":2,"items":[
  {"priceId":109,"productId":39,"price":1400,"amount":"Topping Chocolate 1kg","quantity":1},
  {"priceId":110,"productId":39,"price":950, "amount":"Topping Chocolate 1kg","quantity":1}]}
```

Two lines, correct variants. Before the fix this produced **one** line, quantity 2, at 1400.

**VERIFIED — the server half**, posting both variants in one order with the 950 line tampered to
`price: 1`:

| | before | after |
| --- | --- | --- |
| lines written | 1 | **2** |
| price for `priceId` 109 | 1400.00 | 1400.00 |
| price for `priceId` 110 | *(merged away)* | **950.00** |

| Adversarial payload | Result |
| --- | --- |
| `priceId: 99999` (does not exist) | rejected — "One of the items in your cart is no longer available" |
| `priceId: 110` claiming `product: 1` | accepted, order recorded against **product 39** — the variant's real product, not the claim |

**Still to do, and it is not code:** add `UNIQUE (product_id, amount)` to `prices`. It cannot be
applied until the eight duplicate rows are reconciled (see Data section) — the code above is correct
without it, but the constraint is what stops the ambiguity being re-entered.

---

### S3. ~~The shop grid has no price and no way to add anything to the cart~~ — ❌ RETRACTED: intended design (2026-08-10)

> **Not a bug — a client decision.** The price, the variant dropdown and the add-to-cart button were
> all built at one point and then **removed on the client's instruction**. Browsing to the product
> page is the intended path to buying, and the catalogue grid is meant to show an image and a name
> only.
>
> I read the unused `addToCart`, `handlePriceChange` and `priceList` prop as the remains of a
> deleted footer and "restored" it. That change has been **reverted**: the card is back to image,
> category badge, "N in cart" badge and name. A comment at the top of `product-card.svelte` now
> records the requirement so nobody re-adds it as a missing feature.
>
> Two things from that pass were kept, because they are unrelated to the client's decision:
>
> - **S28** — `class="h-fu ll w-full"`, a typo splitting `h-full`, so the image had no height rule.
>   Still fixed.
> - **S29** — an invalid `href` on a `<div>` nested inside an `<a>`. Still removed.
>
> The card also still receives `priceId` and picks a coherent variant (from S2/S8), so the dead
> `addToCart` is at least correct if it is ever wired up again, and the "N in cart" badge now counts
> every variant of the product rather than one.
>
> The original text follows for the record.

**Where:** `src/lib/components/product-card.svelte`

The card renders an image, a category badge, an "N in cart" badge, and the product name. That is
all. `CardContent` closes right after the name, and there is no `CardFooter`.

Everything needed to sell is present in the file but unreachable:

- `addToCart()` (line 47) — never called
- `handlePriceChange()` (line 63) — never called
- `price`, `amount`, `priceList` props — never rendered
- imports of `Button`, `CardFooter`, `PlusIcon`, `CheckIcon`, `Select*` — all unused

**Failure scenario:** a customer browsing `/shop` sees a wall of names with no prices and no buy
button. They must guess to click through to a detail page. The same stripped card is reused for the
"Related Products" carousel on every product page.

**VERIFIED** — screenshot of `/shop` shows cards containing only a name and a blank image area.

**Fix:** restore the footer — price, a variant selector wired to `handlePriceChange`, and an Add to
Cart button calling `addToCart`. Since `priceList` is already passed in, a compact `Select` over the
variants plus a price line is enough. Do this *after* S2, so the card adds `priceId`.

Note `let { ... } = $props()` with `handlePriceChange` assigning to `amount`/`price` mutates props —
switch those to local `$state` seeded from the props when you wire it up.

**Resolution:** the card now has a `CardContent` + `CardFooter` that sell:

- the selected variant's **price**, formatted;
- a **variant selector** — but only when the product has more than one variant; a single-variant
  product shows its amount as plain text rather than a one-option dropdown;
- an **Add** button calling the existing `addToCart`.

The selector holds `String(prices.id)` as its value and each option reads
`"<amount> — <price>"`, which is what makes the eight identically-labelled variant pairs
distinguishable in the UI today, ahead of the data fix. Prop mutation is gone: `handlePriceChange`
was replaced by a bound `$state` string, and price/amount are read from the selected row.

**VERIFIED** in a real browser:

| Check | Result |
| --- | --- |
| `/shop?search=Topping` | every card shows price + Add; multi-variant cards show a selector, single-variant ones plain text |
| selector options for product 39 | "Topping Chocolate 1kg — ETB 1,400.00" and "— ETB 950.00" |
| choosing the 1400 option | that card's price changes 950.00 → **1,400.00**; the neighbouring card for product 41 is unaffected |
| clicking Add | cart records `priceId: 109` at 1400 — the variant chosen, not the default |
| single-variant card (Topping Caramel) | adds `priceId: 111` at 500 |
| Related Products carousel (no `priceList` passed) | renders and adds correctly — `priceId: 106` at 850 |
| console | no errors or exceptions |

End-to-end, ordering a cart built entirely from the restored cards:

| line | ordered | catalogue price |
| --- | --- | --- |
| variant 109 | 1400.00 | 1400.00 |
| variant 111 | 500.00 | 500.00 |
| variant 106 | 850.00 | 850.00 |

**Fixed alongside (S28):** the product image carried `class="h-fu ll w-full …"` — `h-full` mistyped
with a space — so the image had no height rule and the card collapsed to a strip. That had to go for
the restored footer to sit correctly. The redundant wrapper `<div>` around the image went with it.

---

### S4. Two variants of the same product are indistinguishable on screen — ✅ PARTLY FIXED (2026-08-10)

**Where:** data + `src/lib/components/product-detail.svelte:159-195`

The variant buttons render `{product.amount}` as the label. For the eight products in S2 both
buttons read exactly the same text, differing only in the small price line underneath:

```
┌──────────────────────┐  ┌──────────────────────┐
│ Topping Chocolate 1kg│  │ Topping Chocolate 1kg│  ← identical
│      1400 ETB        │  │      950 ETB         │
└──────────────────────┘  └──────────────────────┘
```

**VERIFIED** by screenshot on `/shop/single/39`.

Worse, "Selected" is decided by price, not identity:

```ts
{@const isActive = currentPrice === numericPrice}
```

Two variants at the same price would both light up as selected. `amount` is being used to store the
product name rather than a package size, so there is nothing to show the customer that distinguishes
the options.

**Fix:** the display half is a data fix (see Data section) — `amount` should hold "1kg" / "500g".
The code half: track the selection by `priceId`, not by price.

```ts
let currentPriceId = $state(priceList?.[0]?.id);
const selected = $derived(priceList?.find((p) => p.id === currentPriceId));
// isActive becomes: product.id === currentPriceId
```

**Resolution (code half):** `isActive` is now `selected?.id === product.id`, so two variants at the
same price can no longer both render as "Selected", and clicking a package selects *that* package
rather than "whichever costs this much". The `{#each}` is keyed on `product.id`.

**Still open (data half):** both buttons still *read* "Topping Chocolate 1kg", because `amount`
holds the product name rather than a package size. The customer can now tell them apart only by the
price line underneath. Fixing that is a data edit — see Data issue 1.

---

## High

### S5. The last page of the catalogue is unreachable — ✅ FIXED (2026-08-10)

**Where:** `src/routes/shop/+layout.server.ts:53`

```ts
const totalPages = Math.ceil(totalCount / pageSize - 1);
```

The `- 1` is inside the division's expression, so it subtracts a whole page before rounding. The
intent was presumably `Math.ceil(totalCount / pageSize)`.

**VERIFIED** against the live catalogue (125 active products, `pageSize` 20):

| Request | `totalPages` | products returned |
| --- | --- | --- |
| `/shop` | **6** | 20 |
| `/shop?page=6` | 6 | 20 (`hasNextPage: false`) |
| `/shop?page=7` | 6 | **4** — a real page of products |
| `/shop?page=8` | 6 | 0 |

The UI renders buttons `1…totalPages` and disables Next at page 6, so **page 7 cannot be reached by
any means other than editing the URL**. Four products are invisible to every customer.

**Fix:**

```ts
const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
```

**Resolution:** applied as written. `Math.max(1, …)` keeps `totalPages` at 1 for an empty result, so
the `{#if totalPages > 1}` guard hides the widget rather than rendering a lone "1".

**VERIFIED** — `totalPages` is now **7**, page 7 returns its 4 products, and `hasNextPage` is true at
page 6. In the browser: the widget renders buttons 1–7 with Next enabled on page 6, and page 7
highlights correctly with Next disabled.

The decisive check — every page reachable through the UI, summed:

```
sum of products across pages 1..7 = 124  (totalCount 124)
```

Nothing is stranded and nothing is double-counted.

---

### S6. The page count ignores every filter — ✅ FIXED (2026-08-10)

**Where:** `src/routes/shop/+layout.server.ts:47-50`

```ts
const [totalResult] = await db
    .select({ count: count(products.id) })
    .from(products)
    .where(eq(products.isActive, true));   // ← no search, no category, no price
```

`whereClause` is built with all the filters and applied to the product query, but the count query
uses only `isActive`.

A search returning four results still renders six page buttons; clicking any of them shows an empty
grid with "No products found".

> **Correction to an earlier draft of this report.** The table here originally claimed
> `/shop?categories=Baking%20Tools` returned **20** products. That figure was wrong — I had measured
> a different category parameter and carried the number across. Re-measured against the pre-fix code
> by reverting the file, it returns **0**, because "Baking Tools" has no active products at all. The
> defect it illustrates (a `totalCount` of 125 regardless of filter) was real either way; only the
> product count was misreported.

**Fix:** count over the same filtered, joined set — and mirror the join, because the price filter
lives on `prices`:

```ts
const [totalResult] = await db
    .select({ count: sql<number>`count(distinct ${products.id})` })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .leftJoin(prices, eq(prices.productId, products.id))
    .where(whereClause);
```

**Resolution:** applied, using drizzle's `countDistinct` and mirroring the *current* joins — the
`innerJoin` on `cheapestVariantInRange` from S8, so the count and the listing agree exactly.

**VERIFIED**, measured on both sides by reverting the file (the "before" column is the real pre-fix
code, not a reconstruction):

| Request | before: products / count / pages / next | after: products / count / pages / next |
| --- | --- | --- |
| no filters | 20 / **125** / **6** / true | 20 / **124** / **7** / true |
| `?search=Topping` | 4 / **125** / **6** / **true** | 4 / **4** / **1** / **false** |
| `?categories=Baking Basics` | 4 / **125** / **6** / **true** | 4 / **4** / **1** / **false** |
| `?categories=Baking Tools` (none exist) | 0 / **125** / **6** / **true** | 0 / **0** / 1 / false |
| `?search=zzzznope` | — | 0 / 0 / 1 / false |

With `totalPages` down to 1, the `{#if totalPages > 1}` guard hides the pagination widget entirely
on a filtered result, instead of offering five dead pages.

**Note on 125 → 124:** the unfiltered count dropped by one because it now counts what is actually
listed. One active product has no row in `prices`, so it never appeared in the grid — it was being
counted but never shown. 124 is the honest number; the missing product is a data problem, not a
pagination one.

---

### S7. The price shown on the product page is not the price of the selected package — ✅ FIXED (2026-08-10)

**Where:** `src/lib/components/product-detail.svelte:30-31`

```ts
let currentPrice = $state(typeof price === 'string' ? parseFloat(price) : price);  // = MIN(price)
let currentAmount = $derived(priceList?.[0]?.amount ?? '');                         // = first row
```

The two halves of the initial selection come from different places. `price` is `MIN(prices.price)`
from the load; `currentAmount` is whatever row the database happened to return first (the
`priceList` query has no `ORDER BY`). They are only the same variant by coincidence.

Because the cart is keyed by `amount` and the server re-prices by `amount`, the customer is charged
the price of `priceList[0]`, while the page displayed the minimum.

**VERIFIED** on `/shop/single/39` with no interaction at all: the page displays **ETB 950.00**, and
adding to cart records the variant whose real price is **1400.00**.

Across the catalogue, `MIN(price)` and the variant named by `MIN(amount)` disagree for **6 of 125
products**.

**Fix:** derive both from one source of truth — the selected variant (see S4):

```ts
let currentPriceId = $state(priceList?.[0]?.id);
const selected = $derived(priceList?.find((p) => p.id === currentPriceId));
const numericPrice = $derived(Number(selected?.price ?? 0));
```

Also give `priceList` a deterministic `ORDER BY prices.price` (or `prices.id`) in the load so "first"
means something.

**Resolution:** applied as written. The `price` prop is no longer used for the displayed figure —
everything (headline price, cart line, "in cart" badge) reads off `selected`, and `priceList` is
ordered `ASC price, ASC id`.

**VERIFIED** on `/shop/single/39` with no interaction: the headline now reads **ETB 950.00** with the
**950** package marked Selected and listed first, and adding to cart records `priceId: 110`
(950.00). Before, the page read 950.00 while adding the 1400.00 variant.

Checked across the whole catalogue via `__data.json` for all pages: for each of the eight
previously-mismatched products, the card's `priceId`, `price` and `amount` now come from one row and
agree — e.g. product 39 `priceId=110 price=950.00`, and variant 110 really does cost 950.00.

---

### S8. The same mismatch on the shop card — ✅ FIXED (2026-08-10)

**Where:** `src/routes/shop/+layout.server.ts:33-34`

```ts
price:  sql<number>`min(${prices.price})`,
amount: sql<number>`min(${prices.amount})`,
```

Two independent aggregates over the same group. `MIN(amount)` is a **lexicographic** minimum of a
varchar and has no relationship to the row that produced `MIN(price)`. The card then passes both to
`cart.addItem` as if they were one variant (once S3 restores the button).

**Fix:** select the cheapest *row*, not two separate minima.

```sql
-- one variant per product, chosen by price
LEFT JOIN prices ON prices.id = (
  SELECT p2.id FROM prices p2 WHERE p2.product_id = products.id
  ORDER BY p2.price ASC, p2.id ASC LIMIT 1
)
```

Then `price`, `amount` and `id` all come from the same row, and the `GROUP BY` disappears.

**Resolution:** applied in both places that build cards — the shop listing and the "Related
Products" query on the detail page. The subquery also carries the price filter:

```ts
const cheapestVariantInRange = sql`${prices.id} = (
    SELECT p2.id FROM prices AS p2
    WHERE p2.product_id = ${products.id} AND p2.price >= ${min} AND p2.price <= ${max}
    ORDER BY p2.price ASC, p2.id ASC LIMIT 1
)`;
```

so a product still matches when **any** of its variants is in range, and the card then shows the
cheapest *in-range* variant. `gte`/`lte` on `prices.price` left the main `WHERE`, and the `GROUP BY`
is gone.

**VERIFIED:** all eight formerly-mismatched products now return a coherent
`priceId`/`price`/`amount` triple (table under S7). Filtering still behaves — `?min=3000&max=9000`
returns the 15 products with a variant in that band.

Two adjacent fixes in the same files: `let allPrices = []` (an implicit `any[]`, S32) is now a
`const` ternary, and the related-products query is skipped when the product has no category —
`eq(column, null)` is never true in SQL, so it would have returned nothing rather than erroring.

---

### S9. The quantity stepper on the product page edits the cart directly — ✅ FIXED (2026-08-10)

**Where:** `src/lib/components/product-detail.svelte:67-78`

```ts
const incrementQuantity = () => {
    quantity += 1;
    cart.updateQuantity(productId, currentAmount, quantity);   // ← writes to the cart
};
```

The stepper is supposed to choose *how many to add*. Instead each click overwrites the quantity of
the matching line already in the cart — and then "Add to Cart" adds that number **on top**.

**VERIFIED**, one continuous session on `/shop/single/39`:

| Action | Cart quantity |
| --- | --- |
| starting state | 2 |
| clicked `+` (no Add to Cart) | 2 |
| clicked `+` again | **3** — cart changed without adding |
| clicked "Add to Cart" once | **6** — 3 + 3 |

A customer nudging the stepper to 3 and pressing Add once ends up with six.

**Fix:** the stepper must only touch local state.

```ts
const incrementQuantity = () => { quantity += 1; };
const decrementQuantity = () => { quantity = Math.max(1, quantity - 1); };
```

The cart already has its own +/− controls in `cart-item.svelte`; that is the right place to mutate it.

**Resolution:** applied — both handlers now only touch local state, clamped through `safeQuantity`.

**VERIFIED** on `/shop/single/39`, cart starting at 2 of variant 110:

| Action | stepper | cart |
| --- | --- | --- |
| start | 2 | 2 |
| `+` | 3 | **2** |
| `+` | 4 | **2** |
| `−` | 3 | **2** |
| "Add to Cart" | 3 | **5** — 2 + 3 |

The cart no longer moves while stepping, and one Add with the stepper at 3 adds exactly 3. The old
behaviour ended at 6.

---

### S10. A blank or invalid quantity puts `null` in the cart — ✅ FIXED (2026-08-10)

**Where:** `src/lib/components/product-detail.svelte:210`, `src/lib/hooks/cart.svelte.ts:67`

```svelte
<Input type="number" bind:value={quantity} min="1" />
```

`min="1"` is not enforced — it only styles the spinner. A rejected entry (typing `-5`) or a cleared
box leaves the input empty, and Svelte binds an empty number input to `null`. `addItem`'s
`quantity = 1` default only fires for `undefined`, so `null` sails through into the cart.

**VERIFIED** — typed `-5` into the quantity box, clicked Add to Cart:

```json
[{"productId":39,"productName":"Topping Chocolate 1kg","price":950,"amount":"Topping Chocolate 1kg","quantity":null}]
```

The cart drawer then shows the line with a blank quantity, **Subtotal ETB 0.00**, **Total (0 items)
ETB 0.00** — and the Checkout button stays enabled. At checkout the zod schema rejects
`quantity: null` and returns the generic "Please check the form for Errors", with nothing on screen
pointing at the offending line.

**Fix:** clamp at the source and defend in the cart.

```ts
// component
const safeQuantity = $derived(Math.max(1, Math.floor(Number(quantity) || 1)));

// cart.svelte.ts — reject nonsense rather than store it
addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    ...
};
```

**Partly addressed as a side effect of S2** (2026-08-10): the cart half is done — `addItem` and
`updateQuantity` both run their argument through `normalizeQuantity`, and `isValidCartItem` drops
stored lines whose quantity isn't a positive number. `null` can no longer reach `localStorage`.

**Completed and verified 2026-08-10.** The component half is now done too: a `safeQuantity` derived
feeds `addItem`, and the input snaps to it on blur so the box cannot keep showing a value that isn't
the one being added.

**VERIFIED** in the browser:

| Action | Result |
| --- | --- |
| type `-5`, click "Add to Cart" | cart goes 5 → **6** — one unit added, never `null` |
| type `-5`, then blur | the box snaps from `-5` to **1** |
| stored quantities after both | `[6]` — plain integers |

The earlier `null` reproduction ("Total (0 items) ETB 0.00" with Checkout still enabled) no longer
occurs.

Also corrected here: the success toast read `quantityInCart + quantity - 1`. `quantityInCart` is the
value from *before* the add, so the `- 1` was simply wrong; it now reports the true new total.

---

### S11. A non-numeric product id returns a 500 — ✅ FIXED (2026-08-10)

**Where:** `src/routes/shop/single/[id]/+layout.server.ts:16,33,64`

`Number(id)` is passed straight into every query. `Number('abc')` is `NaN`, which drizzle binds as-is.

**VERIFIED:** `GET /shop/single/abc` → **HTTP 500 "Internal Error"**.

Any crawler, stale link, or typo produces a server error instead of a 404 — and 500s are what fill
error logs and hurt search indexing.

**Fix:** validate once, at the top.

```ts
const productId = Number(params.id);
if (!Number.isInteger(productId) || productId <= 0) error(404, 'Product not found');
```

**Resolution:** applied at the top of the load, and every subsequent query now uses `productId`
rather than re-deriving `Number(id)`.

**VERIFIED** (see the table under S12 — all invalid forms return 404, none return 500).

**Left alone:** `Number('1e3')` is `1000`, so `/shop/single/1e3` is still accepted as product 1000.
It resolves correctly; it just means one product can be reached by more than one URL, which is an
SEO canonicalisation nit rather than a fault.

---

### S12. A product that doesn't exist renders a broken page instead of a 404 — ✅ FIXED (2026-08-10)

**Where:** `src/routes/shop/single/[id]/+layout.server.ts:20-39`

```ts
const product = await db.select({ ..., price: min(prices.price), ... })
    .from(products)...
    .where(and(eq(products.id, Number(id)), eq(products.isActive, true)))
    .limit(1).then((rows) => rows[0]);

if (!product) error(404, 'Product not found');
```

The select contains an aggregate (`min`) and no `GROUP BY`, so it is a **single-row aggregate
query** — MySQL always returns exactly one row, filled with `NULL`s when nothing matched. `product`
is therefore never falsy and the 404 branch is dead code.

**VERIFIED:**

| Request | Result |
| --- | --- |
| `/shop/single/999999` | **HTTP 200**, `<title> | Lalo Bakery Solutions</title>` |
| `/shop/single/0` | **HTTP 200**, same empty shell |

The page renders with an undefined name, an empty description, and a broken image. Deleted or
deactivated products stay "live" at their old URLs.

**Fix:** drop the aggregate from the identity query and fetch the price separately (the page already
loads `priceList` anyway):

```ts
const product = await db.select({ productId: products.id, productName: products.name, ... })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(and(eq(products.id, productId), eq(products.isActive, true)))
    .limit(1).then((rows) => rows[0]);

if (!product) error(404, 'Product not found');

const lowestPrice = priceList.reduce((min, p) => Math.min(min, Number(p.price)), Infinity);
```

**Resolution:** the aggregate is gone from the identity query, so `rows[0]` really is `undefined`
when nothing matches and the 404 branch is live. The "from" price used in the page metadata is taken
off the front of `priceList`, which S7 already sorted by price ascending — no extra query, and it is
a real variant's price rather than a free-floating aggregate.

**VERIFIED** against a running server:

| URL | Before | After |
| --- | --- | --- |
| `/shop/single/39` (real) | 200 | 200 — unchanged |
| `/shop/single/999999` | **200**, `<title> | Lalo…</title>`, empty shell | **404** "Product not found" |
| `/shop/single/0` | **200**, empty shell | **404** |
| `/shop/single/abc` | **500 Internal Error** | **404** |
| `/shop/single/-1` · `/shop/single/39.5` · `/shop/single/39abc` · `/shop/single/%20` | 500 or empty 200 | **404** |
| product 39 with `is_active = 0` | would render | **404** |

The `is_active` check was exercised by temporarily deactivating product 39 and restoring it; the row
is back to `is_active = 1`.

**One more thing this surfaced (fixed):** a product with *no* variants — there is one in the
catalogue — rendered a price of **"ETB 0.00"**, an empty "Select Package" heading, and an **enabled
"Add to Cart" button that did nothing**, because `addToCart` returns early without a selected
variant. It now reads "Currently unavailable", hides the empty package section, and disables the
button with the label "Unavailable". Normal products are visually unchanged.

---

## Medium

### S13. The cart's prices are a snapshot that never expires, and nothing tells the customer when they're wrong — ✅ FIXED (2026-08-10)

**Where:** `src/lib/hooks/cart.svelte.ts:36-58`, `src/routes/checkout/+page.svelte`

The cart lives in `localStorage` with the price baked in, and is never revalidated. After the C4 fix
the server is authoritative, which is correct — but the customer is never told the two disagree.

**Failure scenario:** a customer adds an item at 950, an admin raises it to 1200, the customer
returns a week later. The cart, the order summary, and the "Complete Order — ETB 950.00" button all
say 950. The order is written at 1200 and the confirmation email says 1200. Nothing warned them.

**Fix:** revalidate on the checkout `load` — it already has the customer's cart in `localStorage`,
so either (a) POST the cart to a small endpoint that returns current prices before enabling submit,
or (b) return the authoritative line items and total in the action's `message` and show a "prices
have changed" confirmation step. (a) is the smaller change:

```ts
// +server.ts — POST cart line ids, get back current prices
export const POST = async ({ request }) => {
    const { priceIds } = await request.json();
    return json(await db.select({ id: prices.id, price: prices.price })
        .from(prices).where(inArray(prices.id, priceIds)));
};
```

**Resolution:** option (a), plus telling the customer what changed.

- New endpoint `src/routes/checkout/prices/+server.ts` returns the current price and label for a
  list of `prices.id`. Variants that no longer exist are simply absent from the response, which is
  how a discontinued item is detected. No auth — these are catalogue prices, already public on every
  product page. Input is validated and capped at 100 ids.
- The checkout page reconciles on mount: repriced lines are corrected via a new `cart.syncVariant`,
  vanished lines are removed, and **submit is disabled until the check completes** (the button reads
  "Checking prices…"), so nothing can be ordered at a price the page never showed.
- A notice lists exactly what changed and states that the total shown is what will be charged.
- If the endpoint fails, the cart is left alone and the customer is let through — the server prices
  the order regardless, so the worst case is the old behaviour rather than a blocked checkout.

**VERIFIED** with a cart seeded to contain one stale price and one discontinued variant:

| Seeded | Result |
| --- | --- |
| variant 110 stored at **600.00** (really 950.00) | corrected to 950.00; subtotal became 1,900.00 |
| variant **99999** (does not exist) | removed from the cart |

The notice rendered: *"Topping Chocolate 1kg is now ETB 950.00 (was ETB 600.00)"* and *"Discontinued
Thing is no longer available and was removed"*.

**Not covered:** this reconciles when the checkout page loads. A price that changes while the
customer sits on the page is still caught only by the server. Closing that would need polling or a
confirmation step on the result, which is more machinery than the problem warrants today.

---

### S35. The delivery fee renders as "NaN" until an address is picked — ✅ FIXED (2026-08-10)

**Where:** `src/routes/checkout/+page.svelte:44, 82`

```ts
$form.fee = Number(fee) ?? 0;
```

`fee` is `undefined` until an address is selected, `Number(undefined)` is `NaN`, and `??` only
catches `null`/`undefined` — never `NaN`. So `$form.fee` becomes `NaN` and stays there.

**VERIFIED** by screenshot on `/checkout` as a signed-in customer with items in the cart: the
**Delivery Fee** field reads `NaN` and the Order Summary's Shipping line reads **`ETBNaN`**.

Found while verifying S1; not in the original sweep. Closely related to S14 — fix them together.

**Fix:**

```ts
$form.fee = Number.isFinite(Number(fee)) ? Number(fee) : 0;
```

and render the row as "Calculated at checkout" rather than a number until an address is chosen.

**Resolution:** applied as both. A `feeAmount` derived guards against `NaN`, and a `feeKnown`
derived decides whether a figure can be quoted at all; the Shipping row reads "Select a delivery
area" until it can.

**VERIFIED:** with no area chosen the Delivery Fee field reads **0** and Shipping reads "Select a
delivery area" — previously `NaN` and `ETBNaN`.

---

### S14. The order summary's "Total" leaves out the delivery fee — ✅ FIXED (2026-08-10)

**Where:** `src/routes/checkout/+page.svelte:317-323`, and the submit button at line 272

```svelte
<div>Subtotal   {formatPrice(cart.totalPrice)}</div>
<div>Shipping   {$form.fee !== 0 ? formatPrice($form.fee) : 'Free'}</div>
<div>Total      {formatPrice(cart.totalPrice)}</div>   <!-- ← same as subtotal -->
```

Shipping is displayed and then not added. The submit button has the same figure: "Complete Order —
{cart.totalPrice}". With the default 200.00 fee the customer is quoted 200 less than they will be
charged.

**Fix:** `const total = $derived(cart.totalPrice + Number($form.fee ?? 0));` and use it in both
places. Ideally take the fee from the server response rather than `$form` (S13).

**Resolution:** an `orderTotal` derived from `cart.totalPrice + feeAmount` now drives the Total row,
the "Your Cart" panel and the submit button. Because S13 reconciles the cart against the catalogue
first, `cart.totalPrice` matches the server's subtotal, so the client's free-delivery rule reaches
the same fee the server will.

**VERIFIED** in the browser with a 1,900.00 cart:

| | before selecting an area | after selecting "Kirkos" (fee 200) |
| --- | --- | --- |
| Subtotal | 1,900.00 | 1,900.00 |
| Shipping | "Select a delivery area" | 200.00 |
| **Total** | 1,900.00 | **2,100.00** |
| Button | "Complete Order — ETB 1,900.00" | **"Complete Order — ETB 2,100.00"** |

Previously the Total and the button both read 1,900.00 with Shipping shown as 200 right above them.

---

### S15. ~~"Save Information" can never be used~~ — ❌ RETRACTED: not a bug (2026-08-10)

> **This finding was wrong.** I claimed the checkbox was `disabled` and that `$form.saveInfo` was
> never set. Tested directly: the checkbox is **not** disabled — `InputComp` simply does not forward
> its `disabled` prop for `type="checkboxSingle"` — it is bound to `$form.saveInfo`, and clicking it
> flips the posted value to `true`.
>
> Confirmed end-to-end: an order placed with `saveInfo: true` and a changed address updated the
> customer row from `("Kirkos", "")` to `("Lideta", "a brand new street")`. **The feature works.**
>
> What is left is a latent trap rather than a defect: passing `disabled` to that `InputComp` does
> nothing, so anyone who later teaches `InputComp` to forward it would silently disable the feature.
> The clearest fix is to drop the meaningless `disabled` prop from the call site.
>
> The original text follows for the record.

**Where:** `src/routes/checkout/+page.svelte:41-48, 224-234`

```ts
onChange: (event) => {
    if (event.paths.includes('address') || event.paths.includes('deliveryAddress')) {
        saveInfo = true;            // ← a local variable, not $form.saveInfo
        $form.fee = Number(fee) ?? 0;
    }
}
```

The local `saveInfo` only controls whether the checkbox is *rendered*, and the checkbox itself is
`disabled`. `$form.saveInfo` is never set, so the posted value is always `false` and the server's
`if (saveInfo)` branch — which updates the customer's stored address — is dead.

**Fix:** drop the local variable, bind the checkbox to `$form.saveInfo`, remove `disabled`, and show
it whenever the address differs from the stored one.

---

### S36. Nobody in "Bole" could check out — ✅ FIXED (2026-08-10)

**Where:** `src/routes/checkout/schema.ts:15`

```ts
address: z.string('Address is required').min(5).max(200),
```

`address` is not free text — it is a `<select>` bound to `place_names.name`. A minimum length is the
wrong rule for it, and **"Bole" is 4 characters**. Of the three active delivery areas (Kirkos, Bole,
Lideta) one was unselectable: choosing it failed validation with *"Too small: expected string to
have >=5 characters"*, surfaced to the customer as the generic "Please check the form for Errors"
with nothing indicating which field was at fault.

Found while testing S15 — my probe happened to pick the second delivery area.

**Failure scenario:** a customer in Bole — a major Addis Ababa district — fills in checkout, presses
Complete Order, and gets an unexplained error. There is no workaround from the UI, because the value
comes from a dropdown they cannot edit.

**Fix applied:** the length floor is now `min(1)` with a meaningful message. Whether the area exists
is settled server-side against `place_names`, which is the check that actually matters.

**VERIFIED** end-to-end as a signed-in customer:

| Order to | Before | After |
| --- | --- | --- |
| "Bole" (4 chars, real area) | **rejected**, no order | **accepted** — order written, `fee` 400.00 (Bole's real fee) |
| "Nowhere" (not an area) | rejected | rejected — "We do not deliver to that area", no order written |
| empty address | rejected | rejected — validation, no order written |

**Worth a look:** `deliveryAddress` keeps its `min(5)`, which is defensible for a free-text street
address. And `place_names` has no length constraint, so a future one- or two-character area name
would have hit the same wall.

---

### S16. Every keystroke in the search box triggers a full page load

**Where:** `src/routes/shop/+page.svelte:149`

```svelte
<Input oninput={handleSearch} ... />
```

`handleSearch` calls `goto()`, which re-runs the layout load: the product query, the count query, the
category query and the prices query. Typing "chocolate" fires nine navigations and 36 queries.

**Fix:** debounce, and only navigate when the value settles.

```ts
let timer: ReturnType<typeof setTimeout>;
function handleSearch() {
    clearTimeout(timer);
    timer = setTimeout(() => updateFilters({ search: searchQuery }), 300);
}
```

---

### S17. The price filter silently hides a fifth of the catalogue

**Where:** `src/routes/shop/+page.svelte:15, 192-203` vs `+layout.server.ts:12`

The sidebar defaults `maxPrice` to **2000** and both range inputs are capped at `max="2000"`. The
server defaults to **1000000**. Real prices run from 1.50 to **8500.00**, and **25 of 216 variants
exceed 2000**.

So the initial view shows everything while the sidebar claims "0–2000 ETB", and the moment the
customer touches any price control, `max=2000` is applied and every product whose cheapest variant is
over 2000 disappears with no explanation.

**Fix:** derive the bounds from the data — return `MIN(price)`/`MAX(price)` from the load and use
them for the slider bounds and defaults, so the UI and the query agree.

---

### S18. Clicking a category label does nothing

**Where:** `src/routes/shop/+page.svelte:226-233`

```svelte
<Checkbox id={`category-${category}`} ... />          <!-- object → "category-[object Object]" -->
<Label for={`category-${category.name}`}>             <!-- "category-Baking Tools" -->
```

`category` is a row object, `category.name` is the string. The two ids never match, so the label is
not associated with its checkbox: clicking the text does nothing, and screen readers announce an
unlabelled checkbox.

**Fix:** use `category.name` in both.

---

### S19. Search treats `%` and `_` as wildcards

**Where:** `src/routes/shop/+layout.server.ts:18`

```ts
search ? like(products.name, `%${search}%`) : undefined
```

Drizzle parameterises the value (so there is no injection), but `LIKE` metacharacters inside it are
still active.

**VERIFIED:** `/shop?search=%25` (a literal `%`) returns every product.

**Fix:** escape before interpolating.

```ts
const escaped = search.replace(/[\\%_]/g, (c) => `\\${c}`);
```

---

### S20. `?page=abc` produces a page with no working navigation — ✅ FIXED (2026-08-10)

**Where:** `src/routes/shop/+layout.server.ts:8`

```ts
const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
```

`?? '1'` only covers a *missing* parameter. `parseInt('abc')` is `NaN`, and `Math.max(1, NaN)` is
`NaN`.

**VERIFIED:** `/shop?page=abc` returns `"currentPage": null`. No page button is highlighted, and
Previous/Next compute `NaN ± 1`.

**Fix:**

```ts
const parsed = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
const page = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
```

**Fixed alongside S5/S6** — it lives in the same computed block, and leaving it would have let the
pagination object still emit `currentPage: null` after the other two were corrected.

**VERIFIED:** `?page=abc` and `?page=-5` both now return `currentPage: 1` with a full first page of
20 products and correct next/prev flags.

---

### S21. Nothing checks stock at any point in the shopping flow

**Where:** the whole flow; stock lives in `products.quantity` and only moves in
`src/routes/dashboard/orders/+page.server.ts:311`.

Stock is decremented **only when an admin marks an order delivered**. Nothing at checkout reads
`products.quantity`, nothing reserves it, and nothing stops an order for 10,000 units of a product
with 8 in stock (product 39 has exactly 8).

**Failure scenario:** two customers order the last unit within a minute of each other. Both succeed,
both get a confirmation email, and staff discover the shortfall at fulfilment time.

**Fix (staged):**
1. Show availability on the product page and disable Add to Cart at zero.
2. Re-check inside the checkout transaction and fail the order with a specific message naming the
   item — the same place `resolveLineItems` already runs.
3. If overselling is a real business risk, reserve on order and release on cancel, rather than
   decrementing on delivery.

Worth deciding explicitly whether backorders are allowed; if they are, this is documentation rather
than a bug.

---

### S22. Every product page runs the full shop listing query

**Where:** `src/routes/shop/+layout.server.ts` is the parent layout of `shop/single/[id]`

Opening one product runs the 20-product listing query, the count query, the categories query and the
`inArray` prices query — none of which the detail page uses.

**Fix:** move the listing load into `src/routes/shop/+page.server.ts`. Nothing else consumes it;
`+page.svelte` reads `data.productList` and `data.pagination`, both of which a page load provides.

---

### S23. A signed-out customer gets a dead-end checkout button

**Where:** `src/routes/checkout/+page.svelte:117-185`

The signed-out branch renders a full-width "Complete Order" submit button, but that form posts only
`selectedProducts` — no address, no delivery address. Since the C4 fix the action answers "Please
sign in to place an order"; before it, the same click produced a validation error.

**Fix:** in the signed-out branch, replace the submit button with the Sign Up / Log In dialogs that
are already rendered above it.

---

### S24. The cart's own open/close state is unused

**Where:** `src/lib/components/floating-cart/cart.svelte:17,28` and `cart.svelte.ts:20,60-62`

The Sheet is driven by a local `let open = $state(false)`, while `cart.isOpen`, `toggle()`, `open()`
and `close()` on the store are never read by it. `<svelte:body style:overflow={cart.isOpen ? ...}>`
therefore never engages, so the page behind the drawer still scrolls.

**Fix:** bind the Sheet to the store (`<Sheet.Root bind:open={cart.isOpen}>`) or delete the unused
store members. Do not leave both.

---

## Low

- **S25.** `src/lib/components/floating-cart/cart-item.svelte:46` prints `ID: {item.productId}` to
  the customer — an internal database id in the shopping cart.
- **S26.** `product-detail.svelte:63-65` — "Share Product" shows a "Link copied to clipboard" toast
  without copying anything. Either call `navigator.clipboard.writeText(location.href)` or remove it.
- **S27.** `product-detail.svelte:55` — the toast reads `Total in cart: ${quantityInCart + quantity - 1}`.
  The `- 1` is arbitrary and `quantityInCart` is the pre-update value, so the number shown is wrong
  in most cases. It also matches on `productId` only, ignoring the variant.
- **S28.** ✅ FIXED — `product-card.svelte:79` had `class="h-fu ll w-full …"`, a typo splitting
  `h-full`, so the image had no height class and cards collapsed to a bare strip. Fixed as part of
  S3.
- **S29.** ✅ FIXED — `product-card.svelte:83` had `<div href="/shop/single/{productId}">`; `href` is
  not a valid attribute on a `div`, and it sat inside an `<a>` already. The redundant wrapper is
  gone.
- **S30.** `product-detail.svelte:89-91` — an empty `$effect(() => {});`. Delete.
- **S31.** `shop/single/[id]/+page.svelte:14-30` — `jsonLd` is fully constructed and its only
  consumer is commented out at line 48. Either ship the structured data or drop the object.
- **S32.** `checkout/+page.svelte:236-251` — the hidden `selectedProducts` input is rendered twice,
  identically. Also `shop/+page.svelte:23-25` computes a `categories` derived that nothing uses
  (the template reads `data.categories`), and `+layout.server.ts:56` declares `let allPrices = []`
  with an implicit `any[]`.
- **S33.** `shop/+page.svelte:20` — `hasActiveFilters` is true whenever *any* query parameter is
  present, and `updateFilters` always sets `page=1`. So the "Reset Filters" button appears after any
  interaction, including clearing the filters.
- **S34.** `shop/+page.svelte:270` — pagination renders one button per page with no windowing. Fine
  at 7 pages, unusable at 70.

---

## Data issues (not code, but they break the code above)

These are rows in the `lalo` database, not defects in the source. Each one makes a bug above worse.

1. **Eight price rows are duplicates by label** — the `amount` column holds the *product name*
   ("Topping Chocolate 1kg") instead of a package size ("1kg", "500g"). This is the direct cause of
   S2 and S4. Fixing the data is necessary but not sufficient: without the `UNIQUE (product_id, amount)`
   constraint and the `priceId` change, it recurs the next time someone types a duplicate.
2. **Duplicate product rows** — 39/41 ("Topping Chocolate 1kg"), 134/135 ("Measuring Cup Set"),
   136/137 ("Measuring spoon Set" / "Measuring Spoon Set", differing only in capitalisation). The
   catalogue shows each twice.
3. **117 of 125 active products have a `NULL` description.** The detail page renders an empty
   paragraph and `<meta name="description" content={undefined}>`.
4. **123 of 125 `featured_image` files do not exist** under `FILES_DIR` on this machine — e.g.
   product 39 points at `ingrendt (6).webp`, and `GET /files/ingrendt%20(6).webp` returns 404. This
   may be a local-data artifact rather than a production problem, but the code has **no fallback for
   a broken image**: `product-card.svelte` only guards `{#if image}` (null), not a failed load. Add
   an `onerror` fallback to the placeholder either way.
5. **Only 8 of 125 active products have a category at all** (`products.category_id IS NULL` for the
   other 117). The category filter therefore hides almost the entire catalogue when used, no
   category badge renders on most cards, and the "Related Products" carousel is empty on all but
   eight product pages — which is why it doesn't appear on, say, `/shop/single/39`. Noticed while
   verifying S3; the code behaves correctly given the data.
6. **One category name has a trailing space** (`"Decoration "`), and `categories` are passed as a
   comma-joined query parameter — so a category name containing a comma would break the filter.
   Trim on write, and consider filtering by id rather than name.

---

## Suggested order of work

1. ~~**S1** — one line, and it is the difference between "checkout works" and "checkout is a blank
   page".~~ ✅
2. ~~**S2 + S4 + S7 + S8**, together, as one change: introduce `priceId` end-to-end~~ ✅ — the code
   half is done. **Still outstanding: the eight duplicate `amount` rows and the
   `UNIQUE (product_id, amount)` constraint** (Data issue 1). Without the data fix the two packages
   remain indistinguishable *on screen*, even though they are now priced correctly.
3. ~~**S3** — restore the card footer~~ — **retracted**, the card is price-less by client decision.
4. ~~**S5 + S6 + S20** — pagination.~~ ✅
5. ~~**S9 + S10** — cart quantity correctness.~~ ✅
6. ~~**S13 + S14 + S35** — make the customer-visible total match what will be charged.~~ ✅ (and
   **S36**, found during that pass)
7. ~~**S11 + S12** — 404 handling on the detail route.~~ ✅
8. **The data issues**, particularly the eight duplicate `amount` rows and the
   `UNIQUE (product_id, amount)` constraint. Nothing in code can make two identically-named variants
   distinguishable to a customer.
9. Everything else in Medium, then Low.

`S21` (stock) is a product decision as much as a code one — worth settling before it is built.
