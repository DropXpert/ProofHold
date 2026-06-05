import { Link, useParams } from "react-router-dom";
import { useDealStore } from "@/store/dealStore";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptSummary } from "@/components/ReceiptSummary";
import { PaymentBox } from "@/components/PaymentBox";
import { StatusPill } from "@/components/StatusPill";
import { WhatHappensNext } from "@/components/WhatHappensNext";
import { isTerminal } from "@/lib/stateMachine";
import { EmptyState } from "@/components/EmptyState";
import { FileQuestion } from "lucide-react";

export default function PayDeal() {
  const { id } = useParams<{ id: string }>();
  const deal = useDealStore((s) => (id ? s.getDeal(id) : undefined));

  if (!deal) {
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

      <ReceiptSummary deal={deal} />

      {showPayment ? (
        <PaymentBox deal={deal} />
      ) : (
        <section className="card px-5 py-4 text-[13px] text-muted">
          {isTerminal(deal.status)
            ? "This deal is closed."
            : "This deal has already been paid. Open the status page to follow progress."}
        </section>
      )}

      <Link
        to={`/deal/${deal.id}/status`}
        className="btn-ghost w-full"
      >
        View timeline
      </Link>
    </div>
  );
}
