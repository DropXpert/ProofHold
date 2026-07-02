import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FilePlus2, ShieldCheck, CheckCircle2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: { icon: LucideIcon; step: string; label: string; detail: string }[] = [
  { icon: FilePlus2, step: "1", label: "Seller creates a deal", detail: "Set price, deadline and what counts as delivery." },
  { icon: ShieldCheck, step: "2", label: "Buyer pays into escrow", detail: "Funds lock on-chain until conditions are met." },
  { icon: CheckCircle2, step: "3", label: "Funds released on delivery", detail: "Buyer confirms and funds go to the seller — or a dispute is settled with proof." },
];

/**
 * Footer link that opens a bottom sheet explaining escrow in 3 steps — keeps
 * the first-timer explainer available without a bulky card on the Home fold.
 */
export function HowEscrowSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-medium text-accent underline-offset-2 hover:underline"
      >
        New here? How escrow works ›
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-app rounded-t-3xl border border-edge bg-surface px-5 pb-8 pt-4 shadow-lift"
              style={{ animation: "alert-dialog-in 0.28s cubic-bezier(0.22,1,0.36,1)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-ink">How escrow works</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-bg hover:text-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {STEPS.map(({ icon: Icon, step, label, detail }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">
                        {step}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13.5px] font-semibold text-ink">{label}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
