import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Deal } from "@/types/deal";
import { StatusPill } from "./StatusPill";
import { formatRelative } from "@/lib/time";

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <Link
      to={`/deal/${deal.id}/status`}
      className="card flex items-center gap-3 px-4 py-3.5 transition hover:shadow-lift"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[15px] font-medium text-ink">
            {deal.title || "Untitled deal"}
          </p>
          <p className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">
            {deal.priceAmount}{" "}
            <span className="text-muted">{deal.priceCurrency}</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <StatusPill status={deal.status} />
          <span className="truncate text-[12px] text-muted">
            {formatRelative(deal.updatedAt)}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
