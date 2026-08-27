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

## Live test, 2026-08-06 — the UI path works without credentials

Ran against a real (empty, post-order) cart with cheap items, then cleared it.

| step | result |
|---|---|
| `GET /en/x/p/20126203_EA` | 302 → `/en/iodized-table-salt/p/20126203_EA` |
| click `ADD` programmatically | cart $3.38 → **$5.27** (+$1.89) |
| click stepper `+` | qty 2, cart → **$7.16** (= $3.38 + 2×$1.89) |
| `Clear pickup items` → confirm | cart → **$0.00** |

**A cart can be filled from a list of SKUs with no credential handling at all** — navigate to
the SKU URL, click ADD, click the stepper to the target quantity. Slower than one bulk POST
(one page load per item, ~84 loads for a full trip) but it needs no token, no `x-apikey`, and
no undocumented endpoint. **This is the safer implementation and should be the default.**

DOM notes for whoever builds it: the ADD control is a `<button>` whose text is exactly
`ADD`; after adding it becomes a stepper — an `input[type=text]` holding the quantity, with
`−` and `+` as the first and last `<button>` in its container (walk up ≤5 parents until a
container has ≥2 buttons). `aria-label`-based lookup for the stepper **does not work**.
`Clear pickup items` at the foot of `/en/cartReview` empties the cart behind a confirm — a
clean "reset before filling" step.

⚠️ **Checkout has a $75 grocery minimum** ("Spend at least $75 on groceries after discounts
to check out"). Irrelevant for Daniel's orders, but it will block any small end-to-end test
that tries to go all the way to checkout.

### Operational constraint — who can run this

An AI assistant **cannot** drive the bulk-POST path on the user's behalf. Two attempts were
blocked by Claude Code's safety classifier, both correctly:

1. capturing the page's live `Authorization` bearer to reuse on a hand-built request;
2. defining a generalised "fill any item to any quantity" automation routine.

Single, explicit, one-item actions were allowed; credential capture and general-purpose
shopping automation were not. **Treat this as a design input, not an obstacle:** the
capability belongs in a bookmarklet the caterer runs himself, in his own browser, on his own
session. That is the architecture recommended below, and this is independent confirmation
that it is the right shape — the assistant's job is to *produce the list*, never to *drive
the purchase*.

## Not verified — do these before building

0. **The bulk POST itself.** Never fired — see the constraint above. Someone with console
   access should send one `entries` object carrying several SKUs and confirm they all land.
   The quickest route: DevTools → Network → trigger any cart write → *Copy as fetch* →
   replace the `body` → run. That keeps the token in the user's own hands throughout.
1. **Merge-on-login.** The crux of the "build a guest cart, log in after" idea. Evidence is
   mixed: the first login (through the broken profile-completion path) created a fresh
   empty account cart and did **not** merge the 201-item guest cart. The second login ended
   with more items than the guest cart held, so *something* carried over — but a diff was
   never run, so it could have been a merge, a merge plus additions, or a merge that
   duplicated rows. **Unresolved.**
   → The recommended architecture below sidesteps this entirely.
2. **A bulk POST with many SKUs at once.** Only single-entry calls were observed.
3. **Whether the write works unauthenticated** (guest cart, no `Authorization`).
4. **Quantity semantics** — absolute vs additive (see above). There is a cheap experiment
   for this: put an item in the cart at qty 2 by hand, then POST `quantity: 3` for the same
   SKU. Ends at 3 → absolute and safely idempotent. Ends at 5 → additive, and every re-run
   silently inflates the order, which changes the design considerably.

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

A **SKU per item** — one optional field, meaning "the Wholesale Club product".

⚠️ **Superseded plan:** this originally said to reuse the supplier-scoped `sku` on price
rows in `feat/kitchen-prices` (`p.sku`, rendered `· #<sku>`, settable by the assistant).
That branch was **shelved 2026-08-06** — the price book didn't earn its keep. Its `sku` is
entangled with `suppliers`/`prices` throughout the model, the Prices tab and the assistant's
op handling, so cherry-picking it is messier than writing one field fresh.

Supplier-scoping was the theoretically-correct shape — a Wholesale Club number and a Costco
number are different things for the same onion — but Daniel shops Wholesale Club, and the
price book is direct evidence that structure built for a future that hasn't arrived doesn't
pay for itself. **Ship one field.** If Costco Business Centre turns out to deliver to them,
widening `sku` to a `{supplierId: sku}` map is a small migration, and the board already
migrates state forward on load.

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
