import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useDealStore } from "@/store/dealStore";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptSummary } from "@/components/ReceiptSummary";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { FileQuestion } from "lucide-react";

export default function BuyerConfirm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deal = useDealStore((s) => (id ? s.getDeal(id) : undefined));
  const confirmReceipt = useDealStore((s) => s.confirmReceipt);

  if (!deal) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Buyer" title="Confirm" />
        <EmptyState
          icon={<FileQuestion className="h-5 w-5" />}
          title="Deal not found"
          action={
            <Link to="/" className="btn-secondary">
              Back to home
            </Link>
          }
        />
      </div>
    );
  }

  function confirm() {
    confirmReceipt(deal!.id);
    navigate(`/deal/${deal!.id}/status`);
  }

  const canConfirm = deal.status === "delivered_by_seller";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Buyer view"
        title="Confirm receipt"
        right={<StatusPill status={deal.status} />}
      />

      <ReceiptSummary deal={deal} />

      {deal.deliveryNote ? (
        <section className="card space-y-2 px-5 py-4">
          <p className="field-label">Seller's delivery note</p>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
            {deal.deliveryNote}
          </p>
        </section>
      ) : null}

      {canConfirm ? (
        <section className="card space-y-4 px-5 py-5">
          <p className="text-[14px] leading-relaxed text-ink">
            Confirm only if you received what was promised. Once confirmed,
            funds release to the seller and the deal closes.
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={confirm}
              className="btn-primary w-full"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm receipt and release funds
            </button>
            <Link
              to={`/deal/${deal.id}/query`}
              className="btn-secondary w-full"
            >
              <ShieldAlert className="h-4 w-4" />
              Something is wrong — raise a query
            </Link>
          </div>
        </section>
      ) : (
        <section className="card px-5 py-4 text-[13px] text-muted">
          This deal isn't waiting on buyer confirmation right now.
        </section>
      )}
    </div>
  );
}
