import { Link, useParams } from "react-router-dom";
import { useDealStore } from "@/store/dealStore";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { ReceiptSummary } from "@/components/ReceiptSummary";
import { ShareLinkCard } from "@/components/ShareLinkCard";
import { WhatHappensNext } from "@/components/WhatHappensNext";
import { EmptyState } from "@/components/EmptyState";
import { FileQuestion, ArrowRight } from "lucide-react";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const deal = useDealStore((s) => (id ? s.getDeal(id) : undefined));

  if (!deal) return <DealNotFound id={id} />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Deal · ${deal.id}`}
        title="Deal created"
        right={<StatusPill status={deal.status} />}
      />

      <WhatHappensNext status={deal.status} />

      <ReceiptSummary deal={deal} />

      <ShareLinkCard dealId={deal.id} />

      <div className="grid gap-2">
        <Link
          to={`/deal/${deal.id}/status`}
          className="btn-secondary w-full"
        >
          View status & timeline
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to={`/deal/${deal.id}/pay`} className="btn-ghost w-full">
          Preview buyer view
        </Link>
      </div>
    </div>
  );
}

function DealNotFound({ id }: { id?: string }) {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Deal" title="Not found" />
      <EmptyState
        icon={<FileQuestion className="h-5 w-5" />}
        title="We can't find that deal"
        description={
          id
            ? `No deal with ID ${id} on this device.`
            : "Missing deal ID."
        }
        action={
          <Link to="/" className="btn-secondary">
            Back to home
          </Link>
        }
      />
    </div>
  );
}
