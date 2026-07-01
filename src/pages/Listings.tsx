import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Package, Star } from "lucide-react";
import { useListingStore } from "@/store/listingStore";
import { useAuthStore } from "@/store/authStore";
import { CategoryTag } from "@/components/CategoryTag";
import type { DealCategory } from "@/types/deal";
import { DEAL_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICON } from "@/types/deal";
import { Package as PkgIcon, Palette, FileText, Code2, MessageSquare, Gamepad2, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CAT_ICON_MAP: Record<string, LucideIcon> = { Package: PkgIcon, Palette, FileText, Code2, MessageSquare, Gamepad2, Tag };

export default function Listings() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DealCategory | "all">("all");
  const { listings, loading, fetchAll } = useListingStore();
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    fetchAll({ category: category === "all" ? undefined : category, search });
  }, [category]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchAll({ category: category === "all" ? undefined : category, search });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Marketplace</p>
          <h1 className="text-[19px] font-bold tracking-tight text-ink leading-tight">Browse listings</h1>
        </div>
        {session && (
          <Link to="/listings/new" className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-[12px]">
            <Plus className="h-4 w-4" />
            Sell
          </Link>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
        <input
          className="input pl-8 pr-20 text-[13px]"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-accent px-2.5 py-1 text-[11.5px] font-medium text-white">
          Search
        </button>
      </form>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`pill shrink-0 transition ${category === "all" ? "border-accent/40 bg-accent-soft text-accent-ink" : "border-edge bg-bg text-muted hover:text-ink"}`}
        >
          All
        </button>
        {DEAL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`pill shrink-0 transition ${category === c ? "border-accent/40 bg-accent-soft text-accent-ink" : "border-edge bg-bg text-muted hover:text-ink"}`}
          >
            {(() => { const I = CAT_ICON_MAP[CATEGORY_ICON[c]]; return I ? <I className="h-3 w-3" /> : null; })()}
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-36 animate-pulse bg-edge/20 px-4 py-4" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="card px-5 py-10 flex flex-col items-center gap-4 text-center">
          <Package className="h-8 w-8 text-muted/40" />
          <div className="space-y-1">
            <p className="text-[13px] font-semibold text-ink">No listings yet</p>
            <p className="text-[11.5px] text-muted">Be the first to list your service.</p>
          </div>
          {session && (
            <Link to="/listings/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              Create listing
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {listings.map((l) => (
            <Link
              key={l.id}
              to={`/listings/${l.id}`}
              className="card flex flex-col gap-3 px-4 py-4 hover:shadow-lift transition"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink leading-snug line-clamp-2 flex-1">
                  {l.title}
                </p>
                <p className="shrink-0 text-[14px] font-bold tabular-nums text-ink">
                  {l.priceAmount}
                  <span className="text-[11px] font-medium text-muted ml-1">{l.priceCurrency}</span>
                </p>
              </div>

              {l.description && (
                <p className="text-[12px] text-muted leading-relaxed line-clamp-2">
                  {l.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                <CategoryTag category={l.category} />
                <div className="flex items-center gap-2.5 text-[11px] text-muted">
                  {l.ordersCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {l.ordersCount} orders
                    </span>
                  )}
                  <span>{l.deliveryHours}h delivery</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
