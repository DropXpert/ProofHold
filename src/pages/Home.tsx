import { Link } from "react-router-dom";
import { FilePlus2, Search, ShieldCheck, Clock, MessageCircle, Store, Zap, ChevronRight, QrCode } from "lucide-react";
import { useMemo } from "react";
import { useDealStore } from "@/store/dealStore";
import { useAuthStore } from "@/store/authStore";
import { resolveDealRole, isParticipant, dealNeedsAction } from "@/lib/dealRole";

export default function Home() {
  const dealsMap = useDealStore((s) => s.deals);
  const session = useAuthStore((s) => s.session);

  const allDeals = useMemo(
    () => Object.values(dealsMap),
    [dealsMap]
  );

  const actionCount = useMemo(() => {
    const addr = session?.address;
    if (!addr) return 0;
    return allDeals.filter(
      (d) => isParticipant(d, addr) && dealNeedsAction(d, resolveDealRole(d, session))
    ).length;
  }, [allDeals, session]);

  return (
    <div className="space-y-7">

      {/* Hero */}
      <section className="space-y-5 pt-1">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Crypto escrow for digital deals
          </p>
          <h1 className="text-[22px] font-bold leading-[1.2] tracking-tight text-ink">
            Trade crypto safely.<br />Funds held until delivery.
          </h1>
          <p className="text-[12px] leading-relaxed text-muted">
            Create a protected payment link. Buyer pays into escrow, seller delivers, funds release automatically. Disputes handled with on-chain proof.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link to="/create/new" className="btn-primary w-full">
            <FilePlus2 className="h-4 w-4" />
            Create a deal
          </Link>
          <Link to="/find" className="btn-secondary w-full">
            <Search className="h-4 w-4" />
            Open existing deal
          </Link>
          <Link to="/scan" className="btn-secondary w-full">
            <QrCode className="h-4 w-4" />
            Scan to pay
          </Link>
        </div>
      </section>

      {/* Action nudge */}
      {actionCount > 0 && (
        <Link
          to="/create"
          className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/8 px-4 py-3.5 transition hover:bg-warning/12"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-warning/15">
            <Zap className="h-4 w-4 text-warning" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-semibold text-ink">
              {actionCount} deal{actionCount > 1 ? "s" : ""} need{actionCount === 1 ? "s" : ""} your attention
            </p>
            <p className="text-[10.5px] text-muted">Go to Your deals</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      )}

      {/* How it works */}
      <section className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">How it works</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: FilePlus2,   step: "1", label: "Seller creates deal" },
            { icon: ShieldCheck, step: "2", label: "Buyer pays into escrow" },
            { icon: Clock,       step: "3", label: "Funds release on delivery" },
          ].map(({ icon: Icon, step, label }) => (
            <div
              key={step}
              className="flex flex-col items-center gap-2 rounded-xl border border-edge bg-surface px-2 py-3.5 text-center"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
                {step}
              </span>
              <Icon className="h-4 w-4 text-muted" />
              <p className="text-[10px] font-medium leading-tight text-ink">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Quick access</p>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/create" className="card flex items-center gap-2.5 px-4 py-3.5 hover:shadow-lift transition">
            <FilePlus2 className="h-4 w-4 text-accent shrink-0" />
            <span className="text-[11px] font-medium text-ink">Your deals</span>
          </Link>
          <Link to="/listings" className="card flex items-center gap-2.5 px-4 py-3.5 hover:shadow-lift transition">
            <Store className="h-4 w-4 text-accent shrink-0" />
            <span className="text-[11px] font-medium text-ink">Marketplace</span>
          </Link>
          <Link to="/find" className="card flex items-center gap-2.5 px-4 py-3.5 hover:shadow-lift transition">
            <Search className="h-4 w-4 text-accent shrink-0" />
            <span className="text-[11px] font-medium text-ink">Find a deal</span>
          </Link>
          <Link to="/support" className="card flex items-center gap-2.5 px-4 py-3.5 hover:shadow-lift transition">
            <MessageCircle className="h-4 w-4 text-accent shrink-0" />
            <span className="text-[11px] font-medium text-ink">Support</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
