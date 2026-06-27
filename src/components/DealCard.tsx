import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Deal } from "@/types/deal";
import { StatusPill } from "./StatusPill";
import { CategoryTag } from "./CategoryTag";
import { formatRelative } from "@/lib/time";

export function DealCard({ deal, to }: { deal: Deal; to?: string }) {
  return (
    <Link
      to={to ?? `/deal/${deal.id}/status`}
      className="card flex items-center gap-3 px-4 py-3.5 transition hover:border-accent/30 hover:shadow-lift"
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            <StatusPill status={deal.status} compact />
            {deal.category && deal.category !== "other" && (
              <CategoryTag category={deal.category} className="text-[11px] shrink-0" />
            )}
          </div>
          <span className="shrink-0 text-[12px] text-muted">
            {formatRelative(deal.updatedAt)}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
