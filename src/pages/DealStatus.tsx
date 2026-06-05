import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FilePlus,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useDealStore } from "@/store/dealStore";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { ReceiptSummary } from "@/components/ReceiptSummary";
import { DealTimeline } from "@/components/DealTimeline";
import { WhatHappensNext } from "@/components/WhatHappensNext";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ActionPanel } from "@/components/ActionPanel";
import { RoleToggle } from "@/components/RoleToggle";
import { TxHashLink } from "@/components/TxHashLink";
import { EmptyState } from "@/components/EmptyState";
import { isTerminal } from "@/lib/stateMachine";
import type { Deal } from "@/types/deal";
import { FileQuestion } from "lucide-react";

export default function DealStatus() {
  const { id } = useParams<{ id: string }>();
  const deal = useDealStore((s) => (id ? s.getDeal(id) : undefined));
  const events = useDealStore((s) => (id ? s.getTimeline(id) : []));
  const proofs = useDealStore((s) => (id ? s.getProofs(id) : []));
  const resolveAfterDeadline = useDealStore(
    (s) => s.resolveAfterProofDeadline
  );
  const viewerRole = useDealStore((s) => s.viewerRole);

  if (!deal) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Deal" title="Status" />
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

  const youProofSubmitted =
    viewerRole === "buyer"
      ? deal.buyerProofStatus === "submitted"
      : deal.sellerProofStatus === "submitted";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Deal · ${deal.id}`}
        title="Status & timeline"
        right={<StatusPill status={deal.status} />}
      />

      <div className="flex items-center justify-between gap-3">
        <RoleToggle />
      </div>

      <WhatHappensNext status={deal.status} />

      {deal.status === "proof_window" ? (
        <CountdownTimer
          deadline={deal.proofDeadlineAt}
          onExpire={() => resolveAfterDeadline(deal.id)}
        />
      ) : null}

      <RoleActions deal={deal} youProofSubmitted={youProofSubmitted} />

      <ReceiptSummary deal={deal} />

      <section className="card space-y-4 px-5 py-5">
        <header className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Timeline</h3>
          <span className="text-[12px] text-muted">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </header>
        <DealTimeline events={events} />
        {deal.paymentTxHash ? (
          <div className="border-t border-edge pt-3">
            <p className="field-label mb-1">Payment tx</p>
            <TxHashLink hash={deal.paymentTxHash} />
          </div>
        ) : null}
      </section>

      {proofs.length > 0 ? (
        <section className="card space-y-4 px-5 py-5">
          <header className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">
              Submitted proofs
            </h3>
            <span className="text-[12px] text-muted">{proofs.length}</span>
          </header>
          <ul className="space-y-3">
            {proofs.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-edge bg-bg px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="pill border-edge bg-surface text-muted">
                    {p.submittedBy === "buyer" ? "Buyer proof" : "Seller proof"}
                  </span>
                  {p.txHash ? (
                    <TxHashLink hash={p.txHash} label="ref" />
                  ) : null}
                </div>
                <p className="mt-2 text-[13.5px] text-ink">
                  {p.explanation}
                </p>
                {p.attachmentUrls.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {p.attachmentUrls.map((url, i) => (
                      <li
                        key={i}
                        className="truncate font-mono text-[12px] text-muted"
                      >
                        {url}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RoleActions({
  deal,
  youProofSubmitted,
}: {
  deal: Deal;
  youProofSubmitted: boolean;
}) {
  const viewerRole = useDealStore((s) => s.viewerRole);

  if (isTerminal(deal.status)) {
    return (
      <section className="card flex items-center gap-3 px-5 py-4">
        {deal.status === "released" || deal.status === "received_by_buyer" ? (
          <CheckCircle2 className="h-5 w-5 text-accent" />
        ) : (
          <XCircle className="h-5 w-5 text-muted" />
        )}
        <p className="text-[14px] text-ink">
          {deal.status === "released" &&
            "Funds were released to the seller. This deal is complete."}
          {deal.status === "refunded" &&
            "The buyer was refunded. This deal is closed."}
          {deal.status === "partially_refunded" &&
            "Funds were split between buyer and seller."}
          {deal.status === "cancelled" && "This deal was cancelled."}
          {deal.status === "expired" && "This deal expired."}
        </p>
      </section>
    );
  }

  // Awaiting payment
  if (deal.status === "awaiting_payment") {
    return (
      <ActionPanel
        heading={
          viewerRole === "buyer"
            ? "Pay into protected hold"
            : "Waiting for buyer to pay"
        }
        description={
          viewerRole === "buyer"
            ? "Review the deal below, then pay. Funds will be held safely."
            : "Share the payment link with your buyer. Funds will be held when they pay."
        }
      >
        {viewerRole === "buyer" ? (
          <Link
            to={`/deal/${deal.id}/pay`}
            className="btn-primary w-full"
          >
            Pay now
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to={`/deal/${deal.id}`} className="btn-secondary w-full">
            Open share link
          </Link>
        )}
      </ActionPanel>
    );
  }

  // Funds held — seller can deliver, both can raise query
  if (deal.status === "funds_held") {
    return (
      <ActionPanel
        heading={
          viewerRole === "seller"
            ? "Funds are held. Deliver the work."
            : "Funds are held. Waiting on the seller."
        }
        description={
          viewerRole === "seller"
            ? "Deliver the product or service, then mark this deal as delivered with a short note."
            : "The seller has been notified. You'll see a confirmation request when they deliver."
        }
      >
        {viewerRole === "seller" ? (
          <Link
            to={`/deal/${deal.id}/seller`}
            className="btn-primary w-full"
          >
            Mark as delivered
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
        <Link
          to={`/deal/${deal.id}/query`}
          className="btn-ghost w-full"
        >
          <ShieldAlert className="h-4 w-4" />
          Raise a query
        </Link>
      </ActionPanel>
    );
  }

  // Delivered — buyer confirms or queries
  if (deal.status === "delivered_by_seller") {
    return (
      <ActionPanel
        heading={
          viewerRole === "buyer"
            ? "Seller marked this as delivered."
            : "Awaiting buyer confirmation."
        }
        description={
          viewerRole === "buyer"
            ? "Confirm only if you received what was promised."
            : "The buyer has been notified to confirm receipt."
        }
      >
        {viewerRole === "buyer" ? (
          <Link
            to={`/deal/${deal.id}/confirm`}
            className="btn-primary w-full"
          >
            Confirm receipt
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
        <Link
          to={`/deal/${deal.id}/query`}
          className="btn-ghost w-full"
        >
          <ShieldAlert className="h-4 w-4" />
          Raise a query
        </Link>
      </ActionPanel>
    );
  }

  // Proof window
  if (deal.status === "proof_window") {
    return (
      <ActionPanel
        heading={
          youProofSubmitted
            ? "Your proof is submitted"
            : "Submit your proof"
        }
        description={
          youProofSubmitted
            ? "Waiting on the other side. If they don't submit within 24 hours, the decision favors you."
            : "Both sides have 24 hours. If only one side submits, that side wins."
        }
      >
        {!youProofSubmitted ? (
          <Link
            to={`/deal/${deal.id}/proof`}
            className="btn-primary w-full"
          >
            <FilePlus className="h-4 w-4" />
            Submit proof
          </Link>
        ) : null}
      </ActionPanel>
    );
  }

  // Under admin review
  if (deal.status === "under_admin_review") {
    return (
      <ActionPanel heading="Under admin review">
        <p className="text-[13px] text-muted">
          Both sides submitted proof — or the deadline passed without proof.
          An admin will release, refund, or split the funds.
        </p>
      </ActionPanel>
    );
  }

  return null;
}
