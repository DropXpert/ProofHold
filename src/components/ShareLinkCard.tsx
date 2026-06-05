import { useMemo, useState } from "react";
import { Copy, Link2, Check, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function ShareLinkCard({ dealId }: { dealId: string }) {
  const url = useMemo(() => {
    if (typeof window === "undefined") return `/deal/${dealId}/pay`;
    return `${window.location.origin}/deal/${dealId}/pay`;
  }, [dealId]);

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

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
      {showQr ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-edge bg-bg px-3 py-4">
          <QRCodeSVG
            value={url}
            size={184}
            level="M"
            bgColor="#F8F3EA"
            fgColor="#171411"
            includeMargin={false}
          />
          <p className="text-[12px] text-muted">
            Scan to open the payment page on another device.
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="btn-secondary w-full"
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-accent" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy link
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((s) => !s)}
          className="btn-secondary w-full"
          aria-expanded={showQr}
        >
          <QrCode className="h-4 w-4" />
          {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>
    </section>
  );
}
