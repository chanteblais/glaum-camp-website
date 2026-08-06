# Filling a Wholesale Club cart from the kitchen board

**Status:** research findings, nothing built. Recorded 2026-08-06.

These notes exist because the previous position — *"automated checkout is off the table
(credentials, bot detection, ToS, money), so the target is an order sheet by item number
that Daniel enters himself"* — turned out to be **half wrong**. The credentials objection
dissolves under the right architecture. The ToS and fragility objections do not.

## How this was found

Chante lost a ~$2,000 / 201-item Wholesale Club cart overnight on 2026-08-05 and it was
recovered on 2026-08-06 by driving her own logged-in browser. The recovery exposed the
site's cart model; a follow-up probe on a $1.69 test item exposed the write API. Everything
below was observed directly in her browser against `wholesaleclub.ca` — nothing is inferred
from documentation, because there is none.

---

## Verified findings

### Product URLs need only the SKU

```
https://www.wholesaleclub.ca/en/<any-slug>/p/<SKU>
```

The slug is cosmetic. `/en/x/p/20091825001_EA` 302s to `/en/cilantro/p/20091825001_EA`.
**An export never needs product names or slugs — the SKU alone is a working link.**

### The cart is a server-side object with a UUID

The browser holds only a *pointer* to it, in `localStorage`:

| key | role |
|---|---|
| `lcl-cart-id-banner` | the active cart the page renders |
| `ANONYMOUS_CART_ID` | the guest cart, survives logout |

Consequences observed:

- **Logout wipes `lcl-cart-id-banner`** but leaves `ANONYMOUS_CART_ID`. This is how the
  original cart "vanished" — it was never deleted, the browser just lost the pointer.
  Restoring the UUID into both keys and reloading `/en/cartReview` brings it back intact.
  Reproduced three times.
- **While signed in, the account cart always wins.** The site overwrites
  `lcl-cart-id-banner` with the account cart ID and ignores both a `localStorage` override
  and a `?cartId=<uuid>` URL parameter. A guest cart is reachable **only while signed out**.

### The write API

```
POST https://api.pcexpress.ca/pcx-bff/api/v1/carts/<cartId>

{ "entries": {
    "20091825001_EA": { "quantity": 1, "fulfillmentMethod": "pickup", "sellerId": "6708" }
} }
```

- `entries` is an **object keyed by SKU**, not an array — so **the whole shopping list goes
  in one POST**, not one call per item.
- `sellerId` is the **store ID** (`6708` = Wholesale Club Viewfield Road, Victoria) — the
  same ID that appears in every `storeId=` query parameter on the site.
- `fulfillmentMethod` was `"pickup"`.
- **Quantity appears to be absolute, not additive.** Decrementing an item from 2 → 1 sent
  `quantity: 1`. If that holds generally the call is idempotent, and re-running a list
  cannot double an order. ⚠️ Worth confirming deliberately before relying on it.

Required headers (names only — values are per-session, never store them):

```
Accept  Content-Type  Accept-Language  Site-Banner  Business-User-Agent
is-helios-account  x-application-type  x-loblaw-tenant-id  x-apikey  Authorization
```

`x-apikey` is a public client key baked into their JS bundle. `Authorization` is the
signed-in user's bearer token. A logged-in page already holds both.

### Other surfaces noticed

- `GET /pcx-bff/api/v1/carts/<cartId>/heartbeat` — keepalive.
- Product pages carry an **ADD TO LIST** button; the site has a native list feature that
  was never explored. It may be a gentler target than the cart.
- Cart rows carry `data-track-products-array` with `productSKU` + `productName` — a clean
  way to read an existing cart back out.
- Bot detection is live: `sp.wholesaleclub.ca/sp/h` sensor POSTs fire on every page, plus
  an Akamai-style script. It did **not** interfere, because the traffic was a real human's
  browser and session.

---

## Not verified — do these before building

1. **Merge-on-login.** The crux of the "build a guest cart, log in after" idea. Evidence is
   mixed: the first login (through the broken profile-completion path) created a fresh
   empty account cart and did **not** merge the 201-item guest cart. The second login ended
   with more items than the guest cart held, so *something* carried over — but a diff was
   never run, so it could have been a merge, a merge plus additions, or a merge that
   duplicated rows. **Unresolved.**
   → The recommended architecture below sidesteps this entirely.
2. **A bulk POST with many SKUs at once.** Only single-entry calls were observed.
3. **Whether the write works unauthenticated** (guest cart, no `Authorization`).
4. **Quantity semantics** — absolute vs additive (see above).

---

## Recommended architecture

**Do not build a guest cart, and do not call this from the server.**

Daniel signs in to Wholesale Club normally, in his own browser. A bookmarklet reads the
cart UUID and auth token from the page he is already on, and POSTs the board's list into
his existing cart in one call. He reviews and checks out himself.

| | |
|---|---|
| Credentials stored | none |
| Data leaving his machine | none |
| Guest cart needed | no |
| Merge problem | does not arise |
| Server-side traffic to their API | none |

**The app's entire job is to emit the `entries` object.** That is a small, testable,
boring feature — which is the point.

### What it needs from the board

A **SKU per item per supplier**. The `sku` field already exists on price rows in
`feat/kitchen-prices` (`p.sku`, rendered as `· #<sku>`, settable by the assistant) and is
currently unused. A SKU belongs on the price row rather than the item because a Wholesale
Club number and a Costco number are different things for the same onion — the existing
shape is already right.

### Guardrails

- **The preview is not optional.** A wrong SKU or pack size on a $2k order is a silent,
  expensive failure. This rides the existing propose → preview → Apply rail like every
  other capability.
- **`sellerId` must match the intended store**, or the order quietly changes stores.
- **Keep the plain product-link export as the always-works fallback** (see SKU-only URLs
  above). If the internal API changes, the links still work.

---

## Risks, stated plainly

- **This is an undocumented internal API.** Using it is not sanctioned, and is very likely
  against Wholesale Club's terms of service however mild the framing. It is Daniel's own
  account, his own cart, his own browser, his own session — the gentlest possible version —
  but it is not a supported integration and nobody should be surprised if it stops working
  or gets blocked.
- **It can change without notice.** No versioning, no contract, no deprecation window.
- **Accuracy is the real exposure**, not access. See the guardrails above.

## Sequencing

The kitchen page is **unauthenticated**, and `/api/kitchen-ai` already spends money
unauthenticated. **A cart-filling capability should not land on a public page.** This
belongs *after* the retire-or-gate thread, not before — and after What If 2026, since
Daniel is catering off this board daily and the fortnight before the festival is the wrong
time to destabilise it.

## Suggested first test

A scratch-board (`?scope=test`) Monday with three or four items whose SKUs are captured by
hand → emit the `entries` object → fire it into a real cart → confirm quantities land
exactly. An end-to-end proof on a trivial order, before anything touches Daniel's real list.
