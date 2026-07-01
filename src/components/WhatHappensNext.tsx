import type { DealStatus } from "@/types/deal";
import { ArrowRight } from "lucide-react";

const copyByStatus: Partial<Record<DealStatus, string[]>> = {
  awaiting_payment: [
    "Share the deal link with your buyer.",
    "Once they pay, funds enter the protected hold.",
  ],
  funds_held: [
    "Deliver the product or service.",
    "Mark the deal as delivered with a short note and proof link.",
    "Buyer reviews and confirms receipt.",
  ],
  delivered_by_seller: [
    "Buyer should confirm receipt to release funds.",
    "If something is wrong, buyer can raise a query.",
  ],
  received_by_buyer: ["Funds are being released to the seller."],
  released: ["This deal is complete."],
  query_open: [
    "Both sides have 24 hours to submit proof.",
    "If only one side submits, that side wins.",
  ],
  proof_window: [
    "Submit your proof before the deadline.",
    "If both sides submit, an admin reviews and decides.",
  ],
  under_admin_review: [
    "An admin is reviewing both sides' proofs.",
    "Decision will be: release, refund, or partial refund.",
  ],
  refunded: ["Buyer has been refunded. This deal is closed."],
  partially_refunded: ["Funds were split between buyer and seller."],
  cancelled: ["This deal was cancelled before payment."],
  expired: ["This deal expired before payment."],
};

export function WhatHappensNext({ status }: { status: DealStatus }) {
  const lines = copyByStatus[status];
  if (!lines || lines.length === 0) return null;
  return (
    <section className="rounded-card border border-edge bg-accent-soft/40 px-4 py-3.5">
      <p className="field-label text-accent-ink">What happens next</p>
      <ul className="mt-2 space-y-1.5">
        {lines.map((line, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-[13.5px] text-ink"
          >
            <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-accent" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
