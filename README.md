# ProofHold

Protected payment links for crypto deals. A Nimiq Pay Mini App that lets a seller create a deal link, holds the buyer's payment until delivery is confirmed, and resolves disputes with a structured 24-hour proof window.

> Crypto deals with proof-based buyer and seller protection.

## What it does

```
Create deal  →  Buyer pays  →  Funds held  →  Seller delivers
            →  Buyer confirms  →  Funds release
```

If something goes wrong:

```
Query raised  →  Both sides submit proof  →  24h timer
              →  Auto-rule (single submitter wins)
              →  Or admin review (both submit, or neither)
```

ProofHold is **not** a marketplace. It's a thin safety layer for private P2P digital deals — logos, templates, paid access, code, small services.

## Quickstart

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Scripts

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the Vite dev server                 |
| `npm run build`   | Type-check and produce a production build |
| `npm run preview` | Preview the production build              |
| `npm run typecheck` | TypeScript only, no emit                |

## Tech

- **Vite + React + TypeScript**
- **Tailwind CSS** with a warm receipt-style palette
- **Zustand** with `localStorage` persistence for deal/proof state
- **react-router-dom** for routing
- **lucide-react** for clean line icons
- A `WalletProvider` interface with two implementations:
  - `MockWalletProvider` — local demo, no network
  - `NimiqWalletProvider` — scaffolded stub for the real Nimiq Pay Mini App SDK

State persists in your browser under the `proofhold.deals.v1` key.

## Project layout

```
src/
  App.tsx               # Routes
  main.tsx              # Entry
  index.css             # Tailwind layer + receipt theme
  types/deal.ts         # Deal, Proof, Query, AdminDecision, TimelineEvent
  lib/
    stateMachine.ts     # allowedTransitions, statusLabel, statusTone
    time.ts             # countdown / formatting helpers
    ids.ts              # PH-XXXX-XXXX deal IDs, mock tx hashes, mock NQ addrs
    cn.ts               # class-merge helper
  store/dealStore.ts    # Zustand store: createDeal, payDeal, markDelivered,
                        # confirmReceipt, raiseQuery, submitProof,
                        # resolveAfterProofDeadline, applyAdminDecision
  wallet/
    WalletProvider.ts   # interface
    MockWalletProvider.ts
    NimiqWalletProvider.ts  # stub for real Nimiq Pay integration
    index.ts            # getWallet() picks the best available provider
  components/
    AppHeader / PageHeader
    StatusPill / DealCard / DealTimeline
    ReceiptSummary / ShareLinkCard
    PaymentBox / ProofUpload / CountdownTimer
    ActionPanel / RoleToggle / WhatHappensNext
    WalletAddressBadge / TxHashLink / EmptyState / Field
  pages/
    Home / CreateDeal / FindDeal
    DealDetail / PayDeal / DealStatus
    SellerDelivery / BuyerConfirm
    RaiseQuery / SubmitProof
    AdminDashboard / AdminReview
    NotFound
```

## Demo scenario

The demo data flow lives in the store — there's no seed script needed. To run the canonical demo from the spec:

1. **Create deal** — `/create`. Title: *Logo design final files.* Price: 20 USDT. Delivery: 48h. Delivery proof: *Figma link + final PNG/SVG files.* Refund terms: *Refund if files are not delivered within 48 hours.*
2. **Share** — copy the link from the deal detail page and open it in another browser/tab.
3. **Pay** — flip the role toggle to *View as buyer* and tap **Pay into ProofHold**. The mock wallet returns a fake tx hash; the deal moves to **funds held**.
4. **Deliver** — flip to seller, open the deal status page, tap **Mark as delivered**, paste your Figma link.
5. **Confirm** — flip to buyer, tap **Confirm receipt and release funds**. Deal moves to **released** and a final receipt timestamp is logged.

Dispute path:

1. After delivery, flip to buyer and tap **Raise a query**. Pick *Link/file does not work* and write a short explanation.
2. The deal enters a 24-hour **proof window**. The countdown runs live.
3. Submit buyer proof on `/deal/:id/proof`. Flip to seller and submit seller proof.
4. With both proofs in, the deal moves to **under admin review**. Open `/admin` and pick the deal.
5. As admin, choose **Release**, **Refund**, or **Partial refund**. Decision is logged with reason.

If only one side submits proof before the deadline, the countdown firing triggers `resolveAfterProofDeadline` — single submitter wins automatically.

## Replacing the mock wallet

`MockWalletProvider` simulates payments locally so the flow is demoable without a real Nimiq Pay host. To wire up the real Nimiq SDK:

1. Fill in `src/wallet/NimiqWalletProvider.ts` against the Nimiq Mini Apps SDK
   (`getAddress`, `sendPayment`, host detection).
2. `getWallet()` already prefers `NimiqWalletProvider` whenever `isAvailable()`
   returns `true`. No call sites in the UI need to change — they only depend on
   the `WalletProvider` interface.

## State machine

`src/lib/stateMachine.ts` is the authority on legal transitions. The store
throws `Illegal transition for deal …` if a caller tries to move to a state
that isn't in the allowed set. All UI actions are gated on the current status
before dispatching, so this only fires for programmer errors.

```ts
const allowedTransitions: Record<DealStatus, DealStatus[]> = {
  draft: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["funds_held", "expired", "cancelled"],
  funds_held: ["delivered_by_seller", "query_open"],
  delivered_by_seller: ["received_by_buyer", "query_open"],
  received_by_buyer: ["released"],
  query_open: ["proof_window"],
  proof_window: ["under_admin_review", "released", "refunded"],
  under_admin_review: ["released", "refunded", "partially_refunded"],
  released: [],
  refunded: [],
  partially_refunded: [],
  cancelled: [],
  expired: [],
};
```

## Design

The visual language is **receipt + safety deposit + paper trail** — warm
off-white background, dark ink text, muted green accent, soft borders,
perforated dividers on the receipt card. Tailwind extends the theme with the
palette from `implementation.md`:

```js
bg:      "#F8F3EA"   // warm paper
surface: "#FFFDF8"   // card
ink:     "#171411"   // text
muted:   "#71695F"   // labels
edge:    "#E4D8C7"   // borders
accent:  "#2F6F5E"   // muted green
warning: "#B7791F"
danger:  "#B94A48"
```

No purple/blue SaaS gradients. No AI/robot icons. No glassmorphism.

## License

MIT — see [LICENSE](./LICENSE).
