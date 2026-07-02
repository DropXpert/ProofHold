import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, FilePlus2, Store, ArrowRight, Bug } from "lucide-react";
import { useDealStore } from "@/store/dealStore";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { resolveDealRole, isParticipant, dealActionHint } from "@/lib/dealRole";
import { isTerminal, isFundsLocked } from "@/lib/stateMachine";
import type { Currency } from "@/types/deal";
import { DealCard } from "@/components/DealCard";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { EscrowHero } from "@/components/home/EscrowHero";
import { NeedsActionRail, type ActionItem } from "@/components/home/NeedsActionRail";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { PopularServices } from "@/components/home/PopularServices";
import { HowEscrowSheet } from "@/components/home/HowEscrowSheet";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function shortAddr(addr: string) {
  const c = addr.replace(/\s+/g, "");
  return c.length <= 10 ? addr : `${c.slice(0, 5)}…${c.slice(-4)}`;
}

export default function Home() {
  const dealsMap = useDealStore((s) => s.deals);
  const session = useAuthStore((s) => s.session);
  const connect = useAuthStore((s) => s.connect);
  const connecting = useAuthStore((s) => s.loading);
  const getProfile = useProfileStore((s) => s.getProfile);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const addr = session?.address;
  const reportFrom = `${pathname}${search}`;
  const [query, setQuery] = useState("");
  // Only show "Connecting…" after the user actually taps connect — authStore
  // starts `loading: true` during session restore, which would otherwise flash
  // the disconnected hero CTA as busy on cold load.
  const [connectClicked, setConnectClicked] = useState(false);

  const myDeals = useMemo(
    () =>
      Object.values(dealsMap)
        .filter((d) => isParticipant(d, addr))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [dealsMap, addr]
  );

  const actionItems = useMemo<ActionItem[]>(() => {
    const out: ActionItem[] = [];
    for (const deal of myDeals) {
      const hint = dealActionHint(deal, resolveDealRole(deal, session));
      if (hint) out.push({ deal, ...hint });
    }
    return out;
  }, [myDeals, session]);

  const activeCount = useMemo(
    () => myDeals.filter((d) => !isTerminal(d.status)).length,
    [myDeals]
  );

  const snapshot = useMemo<Record<Currency, number>>(() => {
    const acc: Record<Currency, number> = { NIM: 0, USDT: 0 };
    for (const d of myDeals) {
      if (isFundsLocked(d.status)) acc[d.priceCurrency] += Number(d.priceAmount) || 0;
    }
    return acc;
  }, [myDeals]);

  const profileName = addr ? getProfile(addr).username : "";
  const avatarUrl = addr ? getProfile(addr).avatarDataUrl : null;
  const recentDeals = myDeals.slice(0, 3);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/listings?q=${encodeURIComponent(q)}` : "/listings");
  }

  return (
    <div className="space-y-5">
      {/* Greeting (connected only) */}
      {session && addr && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="text-[12px] text-muted">{greeting()},</p>
            <p className="truncate text-[17px] font-bold tracking-tight text-ink">
              {profileName || shortAddr(addr)}
            </p>
          </div>
          <Link
            to={`/profile/${encodeURIComponent(addr)}`}
            className="shrink-0 rounded-full ring-1 ring-edge transition active:scale-95"
          >
            <ProfileAvatar address={addr} size="md" avatarDataUrl={avatarUrl} />
          </Link>
        </div>
      )}

      {/* Escrow hero */}
      <EscrowHero
        connected={!!session}
        connecting={connectClicked && connecting}
        onConnect={() => {
          setConnectClicked(true);
          connect();
        }}
        snapshot={snapshot}
        activeCount={activeCount}
        actionCount={actionItems.length}
      />

      {/* Needs your action */}
      {session && <NeedsActionRail items={actionItems} />}

      {/* Search → marketplace */}
      <form onSubmit={onSearch} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services…"
          className="h-11 w-full rounded-pill border border-edge bg-surface pl-11 pr-4 text-[14px] text-ink shadow-receipt placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
        />
      </form>

      {/* Your deals */}
      {session && recentDeals.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-muted">
              Your deals
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-0.5 text-[12px] font-medium text-accent"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-2">
            {recentDeals.map((d) => (
              <li key={d.id}>
                <DealCard deal={d} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Browse by category */}
      <CategoryGrid />

      {/* Popular services */}
      <PopularServices />

      {/* Create / Sell (connected only — disconnected users use the hero CTA) */}
      {session && (
        <div className="grid grid-cols-2 gap-2">
          <Link to="/create/new" className="btn-primary w-full">
            <FilePlus2 className="h-4 w-4" />
            Create a deal
          </Link>
          <Link to="/listings/new" className="btn-secondary w-full">
            <Store className="h-4 w-4" />
            Sell a service
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 border-t border-dashed border-edge pt-4 text-center">
        <HowEscrowSheet />
        <Link
          to={`/bug-report?from=${encodeURIComponent(reportFrom)}`}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted transition hover:text-warning"
        >
          <Bug className="h-3 w-3" />
          Report a bug
        </Link>
      </div>
    </div>
  );
}
