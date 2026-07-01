import { Link, useParams } from "react-router-dom";
import { useDealStore } from "@/store/dealStore";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptSummary } from "@/components/ReceiptSummary";
import { PaymentBox } from "@/components/PaymentBox";
import { StatusPill } from "@/components/StatusPill";
import { WhatHappensNext } from "@/components/WhatHappensNext";
import { StarRating } from "@/components/StarRating";
import { isTerminal } from "@/lib/stateMachine";
import { EmptyState } from "@/components/EmptyState";
import { DealLoader } from "@/components/PageLoader";
import { useDealWithRemoteLoad } from "@/hooks/useDealWithRemoteLoad";
import { FileQuestion } from "lucide-react";

export default function PayDeal() {
  const { id } = useParams<{ id: string }>();
  const { deal, loading } = useDealWithRemoteLoad(id);
  const getFeedbacksForAddress = useDealStore((s) => s.getFeedbacksForAddress);
  const sellerFeedbacks = deal ? getFeedbacksForAddress(deal.sellerWalletAddress) : [];
  const sellerAvg = sellerFeedbacks.length
    ? sellerFeedbacks.reduce((s, f) => s + f.rating, 0) / sellerFeedbacks.length
    : 0;

  if (!deal) {
    if (loading) return <DealLoader title="Opening payment" />;
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Deal" title="Pay" />
        <EmptyState
          icon={<FileQuestion className="h-5 w-5" />}
          title="Deal not found"
          description="The link may be wrong or the deal may have been removed."
          action={
            <Link to="/" className="btn-secondary">
              Back to home
            </Link>
          }
        />
      </div>
    );
  }

  const showPayment = deal.status === "awaiting_payment";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Buyer view"
        title="Pay protected deal"
        right={<StatusPill status={deal.status} />}
      />

      <WhatHappensNext status={deal.status} />

      <div className="card flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="space-y-0.5">
          <p className="field-label">Seller reputation</p>
          {sellerFeedbacks.length > 0 ? (
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(sellerAvg)} size="sm" />
              <span className="text-[12px] font-medium text-ink">
                {sellerAvg.toFixed(1)}
              </span>
              <span className="text-[11.5px] text-muted">
                ({sellerFeedbacks.length} review{sellerFeedbacks.length > 1 ? "s" : ""})
              </span>
            </div>
          ) : (
            <p className="text-[12px] text-muted">No reviews yet</p>
          )}
        </div>
        <Link
          to={`/profile/${encodeURIComponent(deal.sellerWalletAddress)}`}
          className="pill border-edge bg-bg text-muted transition hover:text-ink text-[11.5px]"
        >
          View profile
        </Link>
      </div>

      <ReceiptSummary deal={deal} />

      {showPayment ? (
        <PaymentBox deal={deal} />
      ) : (
        <section className="card px-5 py-4 text-[12px] text-muted">
          {isTerminal(deal.status)
            ? "This deal is closed."
            : "This deal has already been paid. Open the status page to follow progress."}
        </section>
      )}

      <Link to={`/deal/${deal.id}/status`} className="btn-ghost w-full">
        View timeline
      </Link>
    </div>
  );
}
