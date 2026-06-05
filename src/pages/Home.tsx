import { Link } from "react-router-dom";
import { ArrowRight, FilePlus2, Receipt, Lock, Search, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useDealStore } from "@/store/dealStore";
import { DealCard } from "@/components/DealCard";
import { EmptyState } from "@/components/EmptyState";

export default function Home() {
  const dealsMap = useDealStore((s) => s.deals);
  const seedDemo = useDealStore((s) => s.seedDemoDeals);
  const deals = useMemo(
    () =>
      Object.values(dealsMap).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
    [dealsMap]
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 rounded-pill border border-edge bg-surface px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
          <Lock className="h-3 w-3 text-accent" />
          Crypto deal protection
        </div>
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight text-ink">
          Protected payment links for crypto deals.
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Create a deal, hold funds safely, release only when delivery is
          clear. Proof on both sides — no hand-waving.
        </p>
      </section>

      <section className="grid gap-3">
        <Link to="/create" className="btn-primary w-full">
          <FilePlus2 className="h-4 w-4" />
          Create protected deal
        </Link>
        <Link to="/find" className="btn-secondary w-full">
          <Search className="h-4 w-4" />
          Open existing deal
        </Link>
      </section>

      <section className="space-y-3">
        <FeatureRow
          icon={<Receipt className="h-4 w-4 text-accent" />}
          title="Built for digital files, small services, and paid access."
          body="Logos, templates, communities, code snippets, P2P digital deals."
        />
        <FeatureRow
          icon={<Lock className="h-4 w-4 text-accent" />}
          title="Funds are held until both sides complete the deal."
          body="If there's a problem, both sides get 24 hours to submit proof."
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Your deals</h2>
          <span className="text-[12px] text-muted">{deals.length} total</span>
        </div>
        {deals.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-5 w-5" />}
            title="No deals yet"
            description="Your first protected deal will show up here. Or load a few demo deals to look around."
            action={
              <div className="flex flex-col items-center gap-2">
                <Link to="/create" className="btn-secondary">
                  Create one
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => seedDemo()}
                  className="btn-ghost"
                >
                  <Sparkles className="h-4 w-4" />
                  Load demo deals
                </button>
              </div>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {deals.map((d) => (
              <li key={d.id}>
                <DealCard deal={d} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card flex items-start gap-3 px-4 py-3.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-[14px] font-medium text-ink">{title}</p>
        <p className="text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}
