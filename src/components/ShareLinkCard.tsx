import { useMemo, useState } from "react";
import { Copy, Link2, Check } from "lucide-react";

export function ShareLinkCard({ dealId }: { dealId: string }) {
  const url = useMemo(() => {
    if (typeof window === "undefined") return `/deal/${dealId}/pay`;
    return `${window.location.origin}/deal/${dealId}/pay`;
  }, [dealId]);

  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore — user can copy manually
    }
  }

  return (
    <section className="card space-y-3 px-5 py-5">
      <header className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-accent" />
        <h3 className="text-[15px] font-semibold text-ink">
          Shareable payment link
        </h3>
      </header>
      <div className="rounded-lg border border-dashed border-edge bg-bg px-3 py-2.5">
        <p className="break-all font-mono text-[12.5px] text-ink">{url}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="btn-secondary w-full"
        aria-live="polite"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-accent" />
            Link copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy link
          </>
        )}
      </button>
    </section>
  );
}
