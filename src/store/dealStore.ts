import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AdminDecision,
  AdminDecisionType,
  Deal,
  DealQuery,
  DealStatus,
  Proof,
  QueryReason,
  TimelineEvent,
} from "@/types/deal";
import { canTransition } from "@/lib/stateMachine";
import { addHoursIso, nowIso } from "@/lib/time";
import { newDealId, newId } from "@/lib/ids";

const PROOF_WINDOW_HOURS = 24;
// How long a buyer has to pay before the link expires. The spec leaves this
// flexible — 48h matches the default delivery deadline most sellers pick.
const PAYMENT_WINDOW_HOURS = 48;

// Stable singletons so selectors don't thrash when a deal has no records yet.
const EMPTY_PROOFS: Proof[] = [];
const EMPTY_QUERIES: DealQuery[] = [];
const EMPTY_DECISIONS: AdminDecision[] = [];
const EMPTY_TIMELINE: TimelineEvent[] = [];

type ViewerRole = "seller" | "buyer";

interface CreateDealInput {
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: Deal["priceCurrency"];
  sellerWalletAddress: string;
  deliveryDeadlineHours: number;
  confirmationWindowHours: number;
  requiredDeliveryProof: string;
  refundTerms: string;
}

interface PayInput {
  dealId: string;
  buyerWalletAddress: string;
  paymentTxHash: string;
}

interface DeliverInput {
  dealId: string;
  deliveryNote: string;
}

interface RaiseQueryInput {
  dealId: string;
  raisedBy: ViewerRole;
  reason: QueryReason;
  details: string;
}

interface SubmitProofInput {
  dealId: string;
  submittedBy: ViewerRole;
  explanation: string;
  txHash?: string;
  attachmentUrls?: string[];
}

interface AdminDecisionInput {
  dealId: string;
  decision: AdminDecisionType;
  buyerAmount?: string;
  sellerAmount?: string;
  reason: string;
  decidedBy: string;
}

interface DealStoreState {
  deals: Record<string, Deal>;
  proofs: Record<string, Proof[]>;
  queries: Record<string, DealQuery[]>;
  decisions: Record<string, AdminDecision[]>;
  timeline: Record<string, TimelineEvent[]>;
  viewerRole: ViewerRole;

  setViewerRole: (role: ViewerRole) => void;

  // Selectors
  getDeal: (id: string) => Deal | undefined;
  getProofs: (id: string) => Proof[];
  getQueries: (id: string) => DealQuery[];
  getDecisions: (id: string) => AdminDecision[];
  getTimeline: (id: string) => TimelineEvent[];
  listDeals: () => Deal[];
  listDealsForAdmin: () => Deal[];

  // Actions
  createDeal: (input: CreateDealInput) => Deal;
  payDeal: (input: PayInput) => void;
  markDelivered: (input: DeliverInput) => void;
  confirmReceipt: (dealId: string) => void;
  raiseQuery: (input: RaiseQueryInput) => void;
  submitProof: (input: SubmitProofInput) => void;
  resolveAfterProofDeadline: (dealId: string) => void;
  applyAdminDecision: (input: AdminDecisionInput) => void;
  cancelDeal: (dealId: string) => void;
  expireDeal: (dealId: string) => void;
  seedDemoDeals: () => void;

  // Dev helper
  reset: () => void;
}

function appendTimeline(
  state: DealStoreState,
  dealId: string,
  event: Omit<TimelineEvent, "id" | "dealId" | "at"> & { at?: string }
): TimelineEvent[] {
  const existing = state.timeline[dealId] ?? [];
  const entry: TimelineEvent = {
    id: newId("evt"),
    dealId,
    at: event.at ?? nowIso(),
    label: event.label,
    detail: event.detail,
    kind: event.kind,
  };
  return [...existing, entry];
}

function patchDeal(deal: Deal, patch: Partial<Deal>): Deal {
  return { ...deal, ...patch, updatedAt: nowIso() };
}

function transition(
  deal: Deal,
  to: DealStatus,
  patch: Partial<Deal> = {}
): Deal {
  if (!canTransition(deal.status, to)) {
    throw new Error(
      `Illegal transition for deal ${deal.id}: ${deal.status} → ${to}`
    );
  }
  return patchDeal(deal, { ...patch, status: to });
}

export const useDealStore = create<DealStoreState>()(
  persist(
    (set, get) => ({
      deals: {},
      proofs: {},
      queries: {},
      decisions: {},
      timeline: {},
      viewerRole: "seller",

      setViewerRole: (role) => set({ viewerRole: role }),

      getDeal: (id) => get().deals[id],
      getProofs: (id) => get().proofs[id] ?? EMPTY_PROOFS,
      getQueries: (id) => get().queries[id] ?? EMPTY_QUERIES,
      getDecisions: (id) => get().decisions[id] ?? EMPTY_DECISIONS,
      getTimeline: (id) => get().timeline[id] ?? EMPTY_TIMELINE,

      listDeals: () =>
        Object.values(get().deals).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        ),

      listDealsForAdmin: () =>
        Object.values(get().deals)
          .filter(
            (d) =>
              d.status === "under_admin_review" || d.status === "proof_window"
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

      createDeal: (input) => {
        const id = newDealId();
        const now = nowIso();
        const deal: Deal = {
          id,
          title: input.title.trim(),
          description: input.description.trim(),
          priceAmount: input.priceAmount,
          priceCurrency: input.priceCurrency,
          sellerWalletAddress: input.sellerWalletAddress,
          deliveryDeadlineHours: input.deliveryDeadlineHours,
          confirmationWindowHours: input.confirmationWindowHours,
          requiredDeliveryProof: input.requiredDeliveryProof.trim(),
          refundTerms: input.refundTerms.trim(),
          status: "awaiting_payment",
          createdAt: now,
          updatedAt: now,
          paymentDeadlineAt: addHoursIso(now, PAYMENT_WINDOW_HOURS),
          buyerProofStatus: "not_submitted",
          sellerProofStatus: "not_submitted",
        };

        set((state) => ({
          deals: { ...state.deals, [id]: deal },
          timeline: {
            ...state.timeline,
            [id]: appendTimeline(state, id, {
              label: "Deal created",
              detail: deal.title,
              kind: "created",
            }),
          },
        }));
        return deal;
      },

      payDeal: ({ dealId, buyerWalletAddress, paymentTxHash }) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        const next = transition(deal, "funds_held", {
          buyerWalletAddress,
          paymentTxHash,
          paidAt: nowIso(),
        });
        set((state) => ({
          deals: { ...state.deals, [dealId]: next },
          timeline: {
            ...state.timeline,
            [dealId]: appendTimeline(state, dealId, {
              label: "Buyer paid into protected hold",
              detail: `${deal.priceAmount} ${deal.priceCurrency}`,
              kind: "paid",
            }),
          },
        }));
      },

      markDelivered: ({ dealId, deliveryNote }) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        const next = transition(deal, "delivered_by_seller", {
          deliveryNote: deliveryNote.trim(),
          deliveredAt: nowIso(),
        });
        set((state) => ({
          deals: { ...state.deals, [dealId]: next },
          timeline: {
            ...state.timeline,
            [dealId]: appendTimeline(state, dealId, {
              label: "Seller marked as delivered",
              detail: deliveryNote.trim() || undefined,
              kind: "delivered",
            }),
          },
        }));
      },

      confirmReceipt: (dealId) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        const confirmed = transition(deal, "received_by_buyer", {
          receivedAt: nowIso(),
        });
        // Auto-progress to released — the spec says funds release on confirm.
        const released = transition(confirmed, "released", {
          releasedAt: nowIso(),
          releaseTxHash: undefined,
        });
        set((state) => {
          let timeline = appendTimeline(state, dealId, {
            label: "Buyer confirmed receipt",
            kind: "received",
          });
          timeline = appendTimeline(
            { ...state, timeline: { ...state.timeline, [dealId]: timeline } },
            dealId,
            {
              label: "Funds released to seller",
              detail: `${deal.priceAmount} ${deal.priceCurrency}`,
              kind: "released",
            }
          );
          return {
            deals: { ...state.deals, [dealId]: released },
            timeline: { ...state.timeline, [dealId]: timeline },
          };
        });
      },

      raiseQuery: ({ dealId, raisedBy, reason, details }) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        // One active query per deal
        const existingQueries = get().queries[dealId] ?? [];
        if (deal.status === "query_open" || deal.status === "proof_window") {
          return;
        }
        // funds_held or delivered_by_seller → query_open → proof_window
        const queryOpen = transition(deal, "query_open");
        const proofWindow = transition(queryOpen, "proof_window", {
          proofDeadlineAt: addHoursIso(nowIso(), PROOF_WINDOW_HOURS),
        });

        const query: DealQuery = {
          id: newId("qry"),
          dealId,
          raisedBy,
          reason,
          details: details.trim(),
          createdAt: nowIso(),
        };

        set((state) => {
          let timeline = appendTimeline(state, dealId, {
            label: `${raisedBy === "buyer" ? "Buyer" : "Seller"} raised a query`,
            detail: humanQueryReason(reason),
            kind: "query",
          });
          timeline = appendTimeline(
            { ...state, timeline: { ...state.timeline, [dealId]: timeline } },
            dealId,
            {
              label: "Proof window opened",
              detail: "Both sides have 24 hours to submit proof.",
              kind: "proof",
            }
          );
          return {
            deals: { ...state.deals, [dealId]: proofWindow },
            queries: {
              ...state.queries,
              [dealId]: [...existingQueries, query],
            },
            timeline: { ...state.timeline, [dealId]: timeline },
          };
        });
      },

      submitProof: ({
        dealId,
        submittedBy,
        explanation,
        txHash,
        attachmentUrls,
      }) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        if (deal.status !== "proof_window") return;

        const proof: Proof = {
          id: newId("prf"),
          dealId,
          submittedBy,
          explanation: explanation.trim(),
          txHash,
          attachmentUrls: attachmentUrls ?? [],
          createdAt: nowIso(),
        };

        const existing = get().proofs[dealId] ?? [];

        set((state) => ({
          proofs: { ...state.proofs, [dealId]: [...existing, proof] },
          deals: {
            ...state.deals,
            [dealId]: patchDeal(deal, {
              buyerProofStatus:
                submittedBy === "buyer" ? "submitted" : deal.buyerProofStatus,
              sellerProofStatus:
                submittedBy === "seller" ? "submitted" : deal.sellerProofStatus,
            }),
          },
          timeline: {
            ...state.timeline,
            [dealId]: appendTimeline(state, dealId, {
              label: `${submittedBy === "buyer" ? "Buyer" : "Seller"} submitted proof`,
              detail: explanation.trim() || undefined,
              kind: "proof",
            }),
          },
        }));
      },

      resolveAfterProofDeadline: (dealId) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        if (deal.status !== "proof_window") return;

        const buyerSubmitted = deal.buyerProofStatus === "submitted";
        const sellerSubmitted = deal.sellerProofStatus === "submitted";

        // Case A: only buyer → refund buyer
        if (buyerSubmitted && !sellerSubmitted) {
          const next = transition(deal, "refunded", { refundedAt: nowIso() });
          set((state) => ({
            deals: { ...state.deals, [dealId]: next },
            timeline: {
              ...state.timeline,
              [dealId]: appendTimeline(state, dealId, {
                label: "Buyer refunded",
                detail: "Seller did not submit proof within 24 hours.",
                kind: "refund",
              }),
            },
          }));
          return;
        }

        // Case B: only seller → release
        if (!buyerSubmitted && sellerSubmitted) {
          const next = transition(deal, "released", { releasedAt: nowIso() });
          set((state) => ({
            deals: { ...state.deals, [dealId]: next },
            timeline: {
              ...state.timeline,
              [dealId]: appendTimeline(state, dealId, {
                label: "Funds released to seller",
                detail: "Buyer did not submit proof within 24 hours.",
                kind: "released",
              }),
            },
          }));
          return;
        }

        // Case C & D: both, or neither → admin review
        const next = transition(deal, "under_admin_review");
        set((state) => ({
          deals: { ...state.deals, [dealId]: next },
          timeline: {
            ...state.timeline,
            [dealId]: appendTimeline(state, dealId, {
              label: "Moved to admin review",
              detail: buyerSubmitted
                ? "Both sides submitted proof."
                : "Neither side submitted proof in time.",
              kind: "admin",
            }),
          },
        }));
      },

      applyAdminDecision: ({
        dealId,
        decision,
        buyerAmount,
        sellerAmount,
        reason,
        decidedBy,
      }) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        if (
          deal.status !== "under_admin_review" &&
          deal.status !== "proof_window"
        )
          return;

        const target: DealStatus =
          decision === "release_to_seller"
            ? "released"
            : decision === "refund_to_buyer"
            ? "refunded"
            : "partially_refunded";

        const patch: Partial<Deal> = {};
        if (target === "released") patch.releasedAt = nowIso();
        if (target === "refunded") patch.refundedAt = nowIso();
        if (target === "partially_refunded") {
          patch.releasedAt = nowIso();
          patch.refundedAt = nowIso();
        }

        // proof_window can go directly to released/refunded per the state
        // machine, but partial_refund requires chaining through admin review.
        const intermediate =
          deal.status === "proof_window" && target === "partially_refunded"
            ? transition(deal, "under_admin_review")
            : deal;
        const next = transition(intermediate, target, patch);

        const record: AdminDecision = {
          id: newId("adm"),
          dealId,
          decision,
          buyerAmount,
          sellerAmount,
          reason: reason.trim(),
          decidedBy,
          createdAt: nowIso(),
        };

        const existing = get().decisions[dealId] ?? [];

        set((state) => ({
          deals: { ...state.deals, [dealId]: next },
          decisions: {
            ...state.decisions,
            [dealId]: [...existing, record],
          },
          timeline: {
            ...state.timeline,
            [dealId]: appendTimeline(state, dealId, {
              label: humanDecision(decision),
              detail: reason.trim(),
              kind:
                decision === "refund_to_buyer"
                  ? "refund"
                  : decision === "partial_refund"
                  ? "admin"
                  : "released",
            }),
          },
        }));
      },

      cancelDeal: (dealId) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        if (!canTransition(deal.status, "cancelled")) return;
        const next = transition(deal, "cancelled");
        set((state) => ({
          deals: { ...state.deals, [dealId]: next },
          timeline: {
            ...state.timeline,
            [dealId]: appendTimeline(state, dealId, {
              label: "Deal cancelled",
              kind: "cancelled",
            }),
          },
        }));
      },

      expireDeal: (dealId) => {
        const deal = get().deals[dealId];
        if (!deal) return;
        if (deal.status !== "awaiting_payment") return;
        if (!canTransition(deal.status, "expired")) return;
        const next = transition(deal, "expired");
        set((state) => ({
          deals: { ...state.deals, [dealId]: next },
          timeline: {
            ...state.timeline,
            [dealId]: appendTimeline(state, dealId, {
              label: "Deal expired",
              detail: "Buyer did not pay within the payment window.",
              kind: "expired",
            }),
          },
        }));
      },

      seedDemoDeals: () => {
        const now = nowIso();
        const make = (
          patch: Partial<Deal> & { id: string; title: string; status: DealStatus }
        ): Deal => ({
          id: patch.id,
          title: patch.title,
          description:
            patch.description ?? "Demo deal seeded for walkthrough purposes.",
          priceAmount: patch.priceAmount ?? "20",
          priceCurrency: patch.priceCurrency ?? "USDT",
          sellerWalletAddress:
            patch.sellerWalletAddress ??
            "NQ07 DEMO SELL ER00 0000 0000 0000 0000 0000",
          buyerWalletAddress: patch.buyerWalletAddress,
          deliveryDeadlineHours: patch.deliveryDeadlineHours ?? 48,
          confirmationWindowHours: patch.confirmationWindowHours ?? 24,
          requiredDeliveryProof:
            patch.requiredDeliveryProof ??
            "Figma link + final PNG/SVG files.",
          refundTerms:
            patch.refundTerms ??
            "Refund if files are not delivered within 48 hours.",
          status: patch.status,
          paymentTxHash: patch.paymentTxHash,
          escrowTxHash: patch.escrowTxHash,
          releaseTxHash: patch.releaseTxHash,
          refundTxHash: patch.refundTxHash,
          createdAt: patch.createdAt ?? now,
          updatedAt: patch.updatedAt ?? now,
          paidAt: patch.paidAt,
          deliveredAt: patch.deliveredAt,
          receivedAt: patch.receivedAt,
          releasedAt: patch.releasedAt,
          refundedAt: patch.refundedAt,
          paymentDeadlineAt:
            patch.paymentDeadlineAt ??
            (patch.status === "awaiting_payment"
              ? addHoursIso(now, PAYMENT_WINDOW_HOURS)
              : undefined),
          proofDeadlineAt: patch.proofDeadlineAt,
          buyerProofStatus: patch.buyerProofStatus ?? "not_submitted",
          sellerProofStatus: patch.sellerProofStatus ?? "not_submitted",
          deliveryNote: patch.deliveryNote,
        });

        const demoBuyer = "NQ22 DEMO BUYE R000 0000 0000 0000 0000 0000";
        const demoTx =
          "0xdemo000000000000000000000000000000000000000000000000000000000001";

        const awaiting = make({
          id: "PH-DEMO-AWAY",
          title: "Logo design final files",
          priceAmount: "20",
          priceCurrency: "USDT",
          status: "awaiting_payment",
        });
        const funds = make({
          id: "PH-DEMO-HELD",
          title: "Notion template — finance OS",
          priceAmount: "15",
          priceCurrency: "USDT",
          status: "funds_held",
          buyerWalletAddress: demoBuyer,
          paymentTxHash: demoTx,
          paidAt: now,
        });
        const proof = make({
          id: "PH-DEMO-PRUF",
          title: "Brand sprint — 1h session",
          priceAmount: "120",
          priceCurrency: "NIM",
          status: "proof_window",
          buyerWalletAddress: demoBuyer,
          paymentTxHash: demoTx,
          paidAt: now,
          deliveredAt: now,
          proofDeadlineAt: addHoursIso(now, PROOF_WINDOW_HOURS),
          buyerProofStatus: "submitted",
        });
        const released = make({
          id: "PH-DEMO-DONE",
          title: "Discord access — pro tier",
          priceAmount: "10",
          priceCurrency: "USDT",
          status: "released",
          buyerWalletAddress: demoBuyer,
          paymentTxHash: demoTx,
          paidAt: now,
          deliveredAt: now,
          receivedAt: now,
          releasedAt: now,
        });

        const list = [awaiting, funds, proof, released];

        set((state) => {
          const deals = { ...state.deals };
          const timeline = { ...state.timeline };
          const queries = { ...state.queries };
          const proofs = { ...state.proofs };
          for (const d of list) {
            deals[d.id] = d;
            timeline[d.id] = [
              {
                id: newId("evt"),
                dealId: d.id,
                at: d.createdAt,
                label: "Deal created (demo)",
                detail: d.title,
                kind: "created",
              },
            ];
            if (d.status === "proof_window") {
              queries[d.id] = [
                {
                  id: newId("qry"),
                  dealId: d.id,
                  raisedBy: "buyer",
                  reason: "broken_link",
                  details: "Link to delivered file does not load.",
                  createdAt: now,
                },
              ];
              proofs[d.id] = [
                {
                  id: newId("prf"),
                  dealId: d.id,
                  submittedBy: "buyer",
                  explanation: "Screenshot of broken link.",
                  attachmentUrls: ["https://example.com/screenshot.png"],
                  createdAt: now,
                },
              ];
            }
          }
          return { deals, timeline, queries, proofs };
        });
      },

      reset: () =>
        set({
          deals: {},
          proofs: {},
          queries: {},
          decisions: {},
          timeline: {},
        }),
    }),
    {
      name: "proofhold.deals.v1",
      version: 1,
    }
  )
);

function humanQueryReason(reason: QueryReason) {
  switch (reason) {
    case "product_not_received":
      return "Product not received";
    case "wrong_product":
      return "Wrong product";
    case "broken_link":
      return "Link/file does not work";
    case "incomplete_delivery":
      return "Delivery incomplete";
    case "buyer_not_confirming":
      return "Buyer received but did not confirm";
    case "false_claim":
      return "Buyer is making a false claim";
    case "no_response":
      return "Buyer is not responding";
    case "other":
      return "Other";
  }
}

function humanDecision(decision: AdminDecisionType) {
  switch (decision) {
    case "release_to_seller":
      return "Admin released funds to seller";
    case "refund_to_buyer":
      return "Admin refunded buyer";
    case "partial_refund":
      return "Admin applied partial refund";
  }
}
