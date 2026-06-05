import { Link, useLocation } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function AppHeader() {
  const { pathname } = useLocation();
  const onAdmin = pathname.startsWith("/admin");
  return (
    <header className="mx-auto flex w-full max-w-app items-center justify-between px-5 pt-5">
      <Link to="/" className="group flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-card border border-edge bg-surface shadow-receipt">
          <Lock className="h-4 w-4 text-accent" strokeWidth={2.25} />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight">
            ProofHold
          </span>
          <span className="block text-[11px] uppercase tracking-[0.14em] text-muted">
            Protected deals
          </span>
        </span>
      </Link>
      <Link
        to={onAdmin ? "/" : "/admin"}
        className={cn(
          "pill border-edge bg-surface text-muted",
          onAdmin && "text-ink"
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {onAdmin ? "Exit admin" : "Admin"}
      </Link>
    </header>
  );
}
