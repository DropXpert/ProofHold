import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { useDealStore } from "@/store/dealStore";
import { PageHeader } from "@/components/PageHeader";
import { ReceiptSummary } from "@/components/ReceiptSummary";
import { Field } from "@/components/Field";
import { StatusPill } from "@/components/StatusPill";
import { EmptyState } from "@/components/EmptyState";
import { FileQuestion } from "lucide-react";

export default function SellerDelivery() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deal = useDealStore((s) => (id ? s.getDeal(id) : undefined));
  const markDelivered = useDealStore((s) => s.markDelivered);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!deal) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Seller" title="Deliver" />
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setError("Add a short delivery note so the buyer knows what to check.");
      return;
    }
    markDelivered({ dealId: deal!.id, deliveryNote: note });
    navigate(`/deal/${deal!.id}/status`);
  }

  const canDeliver = deal.status === "funds_held";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Seller view"
        title="Mark as delivered"
        right={<StatusPill status={deal.status} />}
      />

      <ReceiptSummary deal={deal} />

      {canDeliver ? (
        <form onSubmit={submit} className="card space-y-4 px-5 py-5">
          <Field
            label="Delivery note"
            required
            hint="Tell the buyer where to find what you delivered. Add links."
          >
            <textarea
              className="textarea"
              placeholder={"Figma link: https://figma.com/file/...\nExports attached in the Drive folder."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={800}
              autoFocus
            />
          </Field>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-primary w-full">
            <Send className="h-4 w-4" />
            Mark as delivered
          </button>

          <p className="text-[12px] leading-relaxed text-muted">
            Once marked, the buyer is asked to confirm receipt. Funds stay
            held until they confirm — or until a query is resolved.
          </p>
        </form>
      ) : (
        <section className="card px-5 py-4 text-[13px] text-muted">
          This deal isn't in the right state to mark delivered.
        </section>
      )}
    </div>
  );
}
