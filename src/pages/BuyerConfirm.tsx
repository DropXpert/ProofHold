import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldAlert, FileQuestion } from "lucide-react";
import { useDealStore } from "@/store/dealStore";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptSummary } from "@/components/ReceiptSummary";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { DealLoader } from "@/components/PageLoader";
import { useDealWithRemoteLoad } from "@/hooks/useDealWithRemoteLoad";
import { AlertDialog } from "@/components/AlertDialog";

export default function BuyerConfirm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deal, loading } = useDealWithRemoteLoad(id);
  const confirmReceipt = useDealStore((s) => s.confirmReceipt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const confirmLock = useRef(false);

  if (!deal) {
    if (loading) return <DealLoader title="Opening confirmation" />;
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

  async function confirm() {
    if (confirmLock.current) return;
    confirmLock.current = true;
    setBusy(true);
    setError(null);
    try {
      await Promise.resolve(confirmReceipt(deal!.id));
      navigate(`/deal/${deal!.id}/status`);
    } catch (err: any) {
      setError(err.message ?? "Could not confirm receipt.");
      setBusy(false);
      confirmLock.current = false;
    }
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
              onClick={() => setDialogOpen(true)}
              disabled={busy}
              className="btn-primary w-full"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {busy ? "Confirming..." : "Confirm receipt and release funds"}
            </button>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Link
              to={`/deal/${deal.id}/query`}
              className="btn-secondary w-full"
            >
              <ShieldAlert className="h-4 w-4" />
              Something is wrong? Raise a query
            </Link>
          </div>
        </section>
      ) : (
        <section className="card px-5 py-4 text-[13px] text-muted">
          This deal isn't waiting on buyer confirmation right now.
        </section>
      )}

      <AlertDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Release funds to seller?"
        description="This confirms you received what was promised. Funds will be released to the seller immediately and the deal closes."
        actionLabel="Yes, release funds"
        cancelLabel="Go back"
        busy={busy}
        onAction={confirm}
      />
    </div>
  );
}
