# ProofHold — Nimiq Pay Mini App Implementation Spec

## Product Summary

Build **ProofHold**, a protected payment-link mini app for crypto deals.

ProofHold lets a seller create a protected deal link. The buyer pays into a hold/escrow state. Seller marks the product/service as delivered. Buyer confirms receipt. Once both sides agree, funds are released to the seller. If either party raises a query/dispute, both sides get 24 hours to submit proof. If only one party submits proof within 24 hours, the decision favors that party. If both submit proof, an admin reviews and decides release/refund/partial refund.

This should feel like a simple payment safety layer, not a marketplace.

Primary positioning:

> Crypto deals with proof-based buyer and seller protection.

Avoid generic Web3/AI visuals. No AI symbols, no robot icons, no glowing purple/blue gradients, no “futuristic cyber” look. The app must feel like a clean, trustworthy consumer payment product.

---

## Core Concept

Direct wallet payments are irreversible. ProofHold adds a structured deal layer:

```text
Create deal -> Buyer pays -> Funds held -> Seller delivers -> Buyer confirms -> Funds release
```

If there is a problem:

```text
Query raised -> Buyer proof + seller proof requested -> 24h timer -> auto-rule or admin review
```

---

## Target Users

### Sellers
- Freelancers
- Digital product sellers
- Template sellers
- Designers
- Developers
- Paid community owners
- Small service providers
- Local online sellers

### Buyers
- People buying digital files, services, access, or custom work from someone they do not fully trust yet.

---

## Main Use Cases

1. Logo/design final file delivery
2. Paid Notion/Figma/templates
3. Paid Telegram/Discord/community access
4. Code snippets, small scripts, prompt packs
5. Freelance micro-service delivery
6. Private P2P digital deals
7. Local service deposit with proof

---

## Product Name

Use **ProofHold** unless the user changes the name.

Alternative names:
- HoldPay
- SafeDeal
- ProofPay
- TrustLink
- DealHold
- PayProof

---

## Design Direction

### Design Goal

Make the product feel:
- trustworthy
- calm
- human
- simple
- premium
- non-generic
- non-AI-looking
- usable by non-technical users

### Strict Visual Rules

Do **not** use:
- AI icons
- robot icons
- magic sparkles
- neural network graphics
- generic purple/blue SaaS gradients
- glassmorphism overload
- crypto cliché visuals
- random 3D coins everywhere
- dark-only “hacker” UI
- overly futuristic visuals
- “AI generated” stock aesthetics

### Preferred Visual Style

Use a **receipt + safety deposit + paper trail** visual language.

Recommended style:
- off-white / warm background
- dark ink text
- muted accent color
- card-based layout
- soft borders
- clear status pills
- receipt-like deal summary
- progress timeline
- proof attachments shown like paper slips
- simple icons: lock, receipt, clock, check, warning, file
- no unnecessary animations

### Color Direction

Use a unique but calm palette. Example:

```css
--bg: #F8F3EA;
--surface: #FFFDF8;
--text: #171411;
--muted: #71695F;
--border: #E4D8C7;
--accent: #2F6F5E;
--accent-soft: #DDEBE5;
--warning: #B7791F;
--danger: #B94A48;
--success: #2F6F5E;
```

Do not use typical AI colors like neon purple, cyan glow, or black/purple gradients.

### Typography

Use simple, readable fonts:
- Inter
- Manrope
- Satoshi
- Geist
- system font stack

Avoid decorative fonts.

### UI Personality

Use plain language.

Good:
- “Funds are safely held”
- “Seller marked this as delivered”
- “Confirm receipt”
- “Raise a query”
- “Proof needed within 24 hours”

Bad:
- “Decentralized trustless arbitration protocol”
- “AI-powered dispute oracle”
- “Smart escrow revolution”

---

## App Structure

Build as a mobile-first Nimiq Pay Mini App.

The app should have these main screens:

1. Welcome / Home
2. Create Deal
3. Deal Detail
4. Buyer Payment Flow
5. Seller Delivery Flow
6. Buyer Confirmation Flow
7. Query / Dispute Flow
8. Proof Submission
9. Admin Review Panel
10. Deal History

---

## Core Deal States

Use these statuses internally:

```ts
type DealStatus =
  | "draft"
  | "awaiting_payment"
  | "funds_held"
  | "delivered_by_seller"
  | "received_by_buyer"
  | "released"
  | "query_open"
  | "proof_window"
  | "under_admin_review"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "expired";
```

### Status Meaning

#### draft
Seller is creating the deal. Not visible to buyer yet.

#### awaiting_payment
Deal link is active. Buyer has not paid yet.

#### funds_held
Buyer has paid. Funds are held. Seller should deliver.

#### delivered_by_seller
Seller marked the product/service as delivered. Buyer must confirm receipt or raise query.

#### received_by_buyer
Buyer confirmed receipt. Funds can be released.

#### released
Funds released to seller.

#### query_open
Buyer or seller raised a query.

#### proof_window
Both sides have 24 hours to submit proof.

#### under_admin_review
Both sides submitted proof or the case requires manual review.

#### refunded
Buyer refunded.

#### partially_refunded
Admin split funds.

#### cancelled
Deal cancelled before payment.

#### expired
Deal payment/deadline expired.

---

## Core Deal Rules

### Normal Release

Funds release only when:

```text
seller marks delivered + buyer marks received
```

Then:

```text
release funds to seller
status = released
```

### Query Rule

Either buyer or seller can raise a query.

Once a query is raised:

```text
status = proof_window
proof_deadline = now + 24 hours
```

Both parties are asked to submit proof.

### Proof Submission Rule

Buyer proof can include:
- transaction hash
- payment screenshot
- chat screenshot
- broken link screenshot
- missing access proof
- wrong product proof
- short written explanation

Seller proof can include:
- delivery screenshot
- product sent screenshot
- file/link access screenshot
- email/chat delivery proof
- delivery timestamp
- short written explanation

### 24-Hour Auto Decision Rule

At proof deadline:

#### Case A: only buyer submitted proof
Decision favors buyer.

```text
refund buyer
status = refunded
```

#### Case B: only seller submitted proof
Decision favors seller.

```text
release funds to seller
status = released
```

#### Case C: both submitted proof
Admin review required.

```text
status = under_admin_review
```

#### Case D: neither submitted proof
Admin review required, or follow fallback rule.

Recommended fallback for MVP:

```text
status = under_admin_review
```

Do not silently release/refund if no one submits proof.

### Admin Decision Options

Admin can choose:

```ts
type AdminDecision =
  | "release_to_seller"
  | "refund_to_buyer"
  | "partial_refund"
  | "request_more_proof";
```

For MVP, implement:
- release to seller
- refund to buyer
- partial refund

---

## Important Product Constraint

Do not build a marketplace in v1.

ProofHold v1 is only:

```text
protected payment links for private deals
```

No public marketplace, no search, no seller discovery, no feeds.

---

## User Flows

## 1. Seller Creates Deal

Fields:

```ts
Deal {
  id: string;
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: "NIM" | "USDT";
  sellerWalletAddress: string;
  buyerWalletAddress?: string;
  deliveryDeadlineHours: number;
  confirmationWindowHours: number;
  requiredDeliveryProof: string;
  refundTerms: string;
  status: DealStatus;
  createdAt: string;
  expiresAt?: string;
}
```

Required fields:
- title
- price
- currency
- delivery deadline
- what counts as delivery
- refund terms

Create Deal UI:

```text
What are you selling?
[ Logo design final files ]

Price
[ 20 ] [ USDT ]

Delivery deadline
[ 48 hours ]

What counts as delivery?
[ Figma link + exported final files ]

Refund terms
[ Refund if files are not delivered within 48 hours ]

[ Create protected payment link ]
```

After creation:
- show shareable link
- show QR code
- show deal preview

---

## 2. Buyer Opens Deal Link

Buyer sees:

- deal title
- seller address/name
- price
- delivery terms
- refund terms
- current status
- warning: “Funds are held until delivery is confirmed or dispute is resolved.”

CTA:

```text
[ Pay into ProofHold ]
```

After payment:
- status = funds_held
- seller gets notification/state update

---

## 3. Seller Marks Delivered

Seller sees:

```text
Buyer has paid. Funds are held.
Deliver the product/service, then mark delivered.
```

Seller submits:
- delivery note
- optional attachment/link
- proof screenshot/link

CTA:

```text
[ Mark as delivered ]
```

Then:
- status = delivered_by_seller
- buyer sees confirmation request

---

## 4. Buyer Confirms Receipt

Buyer sees:

```text
Seller marked this as delivered.
Confirm only if you received what was promised.
```

Actions:
- Confirm received
- Raise query

If buyer confirms:
- status = received_by_buyer
- release funds to seller
- status = released

---

## 5. Query Flow

Query can be raised by buyer or seller.

Query reasons:

Buyer:
- Product not received
- Wrong product
- Link/file does not work
- Delivery incomplete
- Other

Seller:
- Buyer received but did not confirm
- Buyer is making a false claim
- Buyer is not responding
- Other

After query:
- show 24h timer
- ask both sides for proof
- show proof checklist

---

## 6. Proof Submission UI

Buyer proof screen:

```text
Submit proof for your claim

Required:
[ ] Short explanation
[ ] Payment transaction hash or wallet payment proof

Optional:
[ ] Screenshot
[ ] Broken link
[ ] Chat proof

[ Submit proof ]
```

Seller proof screen:

```text
Submit delivery proof

Required:
[ ] Short explanation
[ ] Delivery proof

Optional:
[ ] Screenshot
[ ] File/link proof
[ ] Chat proof

[ Submit proof ]
```

After submit:
- mark proof as submitted
- show waiting state

---

## 7. Admin Review Panel

Admin sees:

- deal summary
- buyer proof
- seller proof
- timeline
- transaction details
- attachments
- action buttons

Admin actions:

```text
[ Release to seller ]
[ Refund buyer ]
[ Partial refund ]
```

For partial refund:
- input buyer amount
- input seller amount
- reason required

Admin decision must be logged.

---

## Data Model

Use this as base TypeScript shape.

```ts
type Currency = "NIM" | "USDT";

type PartyRole = "buyer" | "seller" | "admin";

type ProofStatus = "not_submitted" | "submitted";

type DealStatus =
  | "draft"
  | "awaiting_payment"
  | "funds_held"
  | "delivered_by_seller"
  | "received_by_buyer"
  | "released"
  | "query_open"
  | "proof_window"
  | "under_admin_review"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "expired";

interface Deal {
  id: string;
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: Currency;

  sellerWalletAddress: string;
  buyerWalletAddress?: string;

  deliveryDeadlineHours: number;
  confirmationWindowHours: number;

  requiredDeliveryProof: string;
  refundTerms: string;

  status: DealStatus;

  paymentTxHash?: string;
  escrowTxHash?: string;
  releaseTxHash?: string;
  refundTxHash?: string;

  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  deliveredAt?: string;
  receivedAt?: string;
  releasedAt?: string;
  refundedAt?: string;

  proofDeadlineAt?: string;

  buyerProofStatus: ProofStatus;
  sellerProofStatus: ProofStatus;
}

interface Proof {
  id: string;
  dealId: string;
  submittedBy: "buyer" | "seller";
  explanation: string;
  txHash?: string;
  attachmentUrls: string[];
  createdAt: string;
}

interface Query {
  id: string;
  dealId: string;
  raisedBy: "buyer" | "seller";
  reason:
    | "product_not_received"
    | "wrong_product"
    | "broken_link"
    | "incomplete_delivery"
    | "buyer_not_confirming"
    | "false_claim"
    | "no_response"
    | "other";
  details: string;
  createdAt: string;
}

interface AdminDecision {
  id: string;
  dealId: string;
  decision: "release_to_seller" | "refund_to_buyer" | "partial_refund";
  buyerAmount?: string;
  sellerAmount?: string;
  reason: string;
  decidedBy: string;
  createdAt: string;
}
```

---

## Suggested Tech Stack

Use a stack that is easy to ship.

Recommended:
- Next.js or Vite + React
- TypeScript
- Tailwind CSS
- Supabase or Firebase for database/storage
- Serverless functions for deal-state transitions
- Nimiq Mini App SDK / Nimiq Pay wallet integration according to latest docs
- Public GitHub repo
- MIT License

For MVP, if real escrow smart contract/payment hold is complex, implement simulated escrow state for demo but structure the code so real wallet transaction integration can be swapped in.

However, the user-facing flow must clearly show:
- buyer payment
- funds held
- seller delivery
- buyer confirmation
- dispute/proof flow
- release/refund result

---

## Nimiq Pay Integration Requirements

Integrate with Nimiq Pay Mini App environment using the official Nimiq Mini Apps documentation.

The app must:
- run cleanly inside Nimiq Pay mobile
- connect to wallet
- read current wallet address
- support NIM and/or USDT payment flow where possible
- show transaction hash after payment
- use wallet interaction meaningfully

Do not fake all payment behavior if real integration is possible.

Where SDK details are unknown, create an abstraction:

```ts
interface WalletProvider {
  getAddress(): Promise<string>;
  sendPayment(params: {
    to: string;
    amount: string;
    currency: "NIM" | "USDT";
    memo?: string;
  }): Promise<{ txHash: string }>;
}
```

Then implement:
- `MockWalletProvider` for local dev
- `NimiqWalletProvider` for real Mini App integration

---

## Escrow Architecture Note

If true trustless escrow is not available in the first version, represent funds as held by a controlled settlement wallet/admin wallet.

Be transparent in code comments:
- MVP uses custodial/admin-controlled hold logic.
- Future version can use smart-contract/multisig escrow if Nimiq/Ethereum tooling supports it.

User-facing language should avoid false claims like:
- “fully decentralized escrow”
- “trustless arbitration”
- “smart contract guaranteed”

Use:
- “protected hold”
- “proof-based review”
- “funds are held until release/refund decision”

---

## Pages / Routes

Suggested routes:

```text
/
  Home

/create
  Seller creates protected deal

/deal/[id]
  Public deal detail

/deal/[id]/pay
  Buyer payment flow

/deal/[id]/seller
  Seller delivery management

/deal/[id]/confirm
  Buyer receipt confirmation

/deal/[id]/query
  Raise query

/deal/[id]/proof
  Submit proof

/deal/[id]/status
  Timeline and current status

/admin
  Admin dashboard

/admin/deal/[id]
  Admin review
```

---

## Components

Build reusable components:

```text
DealCard
StatusPill
DealTimeline
ReceiptSummary
PaymentBox
ProofUpload
ProofChecklist
CountdownTimer
ActionPanel
AdminDecisionPanel
WalletAddressBadge
TxHashLink
EmptyState
```

---

## Deal Timeline Component

Every deal should show a simple timeline:

```text
1. Deal created
2. Buyer paid
3. Funds held
4. Seller delivered
5. Buyer confirmed
6. Funds released
```

If query:

```text
1. Query raised
2. Proof requested
3. 24h review window
4. Admin decision
5. Released/refunded
```

This timeline is central to user trust.

---

## Home Screen Copy

Use concise copy:

```text
ProofHold

Protected payment links for crypto deals.

Create a deal, hold funds safely, release only when delivery is clear.

[ Create protected deal ]
[ Open existing deal ]
```

Secondary text:

```text
Built for digital files, small services, paid access, and private P2P deals.
```

---

## Deal Detail Copy

```text
Protected Deal

Funds are held until both sides complete the deal or a query is resolved.

Price
20 USDT

Delivery
Figma link + exported final files

Deadline
48 hours

Refund terms
Refund if files are not delivered within 48 hours.
```

CTA:
```text
Pay into protected hold
```

---

## Status Copy

Use clear status labels:

```text
Awaiting payment
Funds held
Seller delivered
Waiting for buyer confirmation
Query opened
Proof needed
Under review
Released to seller
Refunded to buyer
```

Avoid technical labels in UI.

---

## Error Handling

Important cases:
- wallet not connected
- payment rejected
- transaction pending
- tx failed
- deal expired
- seller tries to release without buyer confirmation
- buyer tries to confirm before delivery
- proof deadline passed
- unauthorized user tries admin route
- attachment upload failed

---

## Security / Abuse Considerations

Minimum rules:
- only seller can mark delivered
- only buyer can confirm received
- buyer or seller can raise query
- only buyer/seller can submit proof for that deal
- only admin can decide disputes
- all state transitions must be server-validated
- do not rely only on frontend checks
- log all important actions
- prevent repeated query spam
- one active query per deal
- immutable proof records after submission
- admin decision requires reason

---

## Admin Review Logic

Pseudo-code:

```ts
function resolveAfterProofDeadline(deal: Deal) {
  if (deal.status !== "proof_window") return;

  const buyerSubmitted = deal.buyerProofStatus === "submitted";
  const sellerSubmitted = deal.sellerProofStatus === "submitted";

  if (buyerSubmitted && !sellerSubmitted) {
    refundBuyer(deal.id, "Seller did not submit proof within 24 hours");
    return;
  }

  if (!buyerSubmitted && sellerSubmitted) {
    releaseToSeller(deal.id, "Buyer did not submit proof within 24 hours");
    return;
  }

  if (buyerSubmitted && sellerSubmitted) {
    moveToAdminReview(deal.id);
    return;
  }

  moveToAdminReview(deal.id);
}
```

---

## Payment State Machine

Implement state transitions strictly.

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
  expired: []
};
```

---

## MVP Build Phases

### Phase 1 — UI and local state
- home page
- create deal
- deal detail
- status timeline
- mock wallet payment
- local/mock data

### Phase 2 — Database
- save deals
- create shareable deal links
- save payment tx hash
- save proofs
- save query records

### Phase 3 — Wallet integration
- connect to Nimiq Pay wallet
- read wallet address
- send test payment
- store tx hash

### Phase 4 — Dispute flow
- raise query
- proof upload
- 24h countdown
- auto decision job/function

### Phase 5 — Admin panel
- list open disputes
- view buyer/seller proofs
- release/refund/partial decision
- decision log

### Phase 6 — Polish
- mobile responsive
- empty states
- loading states
- clean animations
- copy pass
- accessibility
- final demo data

---

## Demo Scenario

Use this exact demo scenario:

### Seller
Creates deal:

```text
Title: Logo design final files
Price: 20 USDT
Delivery deadline: 48 hours
Delivery proof: Figma link + final PNG/SVG files
Refund terms: Refund if files are not delivered within 48 hours.
```

### Buyer
Pays into protected hold.

### Seller
Marks delivered and uploads delivery proof.

### Buyer
Either:
- confirms received -> seller gets funds
or
- raises query -> proof window opens

### Dispute Demo
Buyer says:
```text
The shared link does not open.
```

Seller submits:
```text
Screenshot of sent link + access settings.
```

Buyer submits:
```text
Screenshot showing access denied.
```

Admin decides:
```text
Refund buyer or request corrected link.
```

---

## Winning UX Details

Add these touches:
- receipt-style deal card
- big simple progress state
- “What happens next?” block on every screen
- visible 24h timer during proof window
- plain-language warnings before actions
- tiny “proof checklist” so users know what to upload
- final success receipt after release/refund
- shareable deal status page

---

## What Not To Build

Do not build:
- public marketplace
- social feed
- AI dispute judge
- token launch
- complex reputation system
- multi-chain bridge
- KYC system
- complex legal escrow claims
- arbitration marketplace
- DAO voting
- NFT receipts
- complicated chat app

Keep it simple and polished.

---

## Acceptance Criteria

The MVP is successful if:

1. Seller can create a protected deal.
2. Buyer can open deal link and pay.
3. Deal status changes to funds held.
4. Seller can mark delivered.
5. Buyer can confirm received.
6. Funds can be marked released to seller.
7. Buyer or seller can raise query.
8. Both sides can submit proof.
9. 24h proof deadline logic exists.
10. If only one side submits proof, that side wins.
11. If both submit proof, admin review opens.
12. Admin can release/refund/partial refund.
13. UI is clean, mobile-first, unique, and non-AI-generic.
14. App has no AI symbols/colors/cliché visuals.
15. Code is readable, typed, and organized.
16. Public GitHub repo includes MIT License.

---

## Final Instruction For Claude

Build the app with extreme focus on simplicity and trust.

Do not make it look like an AI SaaS landing page. Do not use generic gradients or robot/AI icons. Do not overbuild. The product should feel like a clean payment receipt, a safety hold, and a proof trail.

Prioritize the working flow over fancy features.

The strongest demo is:

```text
Create protected deal -> buyer pays -> seller delivers -> buyer confirms -> release funds
```

Second demo:

```text
Raise query -> both upload proof -> 24h rule/admin decision
```

Everything else is secondary.
