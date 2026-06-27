import { useState } from "react";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import type { Deal } from "@/types/deal";
import { useDealStore } from "@/store/dealStore";
import { getWallet } from "@/wallet";
import { isCustodyConfigured, custodyAddressFor } from "@/lib/config";
import { useNavigate } from "react-router-dom";

export function PaymentBox({ deal }: { deal: Deal }) {
  const submitPayment = useDealStore((s) => s.submitPayment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const usingMock = !isCustodyConfigured(deal.priceCurrency);

  async function handlePay() {
    setBusy(true);
    setError(null);
    try {
      const wallet = await getWallet(deal.priceCurrency);
      const buyer = await wallet.getAddress();
      const result = await wallet.sendPayment({
        to: custodyAddressFor(deal.priceCurrency),
        amount: deal.priceAmount,
        currency: deal.priceCurrency,
        memo: `XcrowHub ${deal.id}`,
      });
      await submitPayment({
        dealId: deal.id,
        buyerWalletAddress: buyer,
        paymentTxHash: result.txHash,
      });
      navigate(`/deal/${deal.id}/status`);
    } catch (err) {
      console.error("[XcrowHub] payment failed:", err);
      setError(formatPaymentError(err));
    } finally {
      setBusy(false);
    }
  }

  function formatPaymentError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const obj = err as Record<string, unknown>;
      const nested = obj.error as Record<string, unknown> | undefined;
      if (nested && typeof nested.message === "string") {
        return `${nested.type ?? "Error"}: ${nested.message}`;
      }
      if (typeof obj.message === "string") return obj.message;
      try {
        return JSON.stringify(err);
      } catch {
        // fall through
      }
    }
    return "Payment failed";
  }

  return (
    <section className="card space-y-4 px-5 py-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Lock className="h-4 w-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-ink">
            Pay into protected hold
          </h3>
          <p className="text-[13px] text-muted">
            Funds are held until the seller delivers and you confirm receipt.
            If anything goes wrong, you can raise a query.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-edge bg-bg p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-wider text-muted">
            Amount
          </span>
          <span className="text-[18px] font-semibold tabular-nums text-ink">
            {deal.priceAmount}{" "}
            <span className="text-muted">{deal.priceCurrency}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className="btn-primary w-full"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming payment…
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Pay into XcrowHub
          </>
        )}
      </button>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-[12px] leading-relaxed text-muted">
        {usingMock
          ? "Demo mode: no real funds move. Set the custody address in .env.local to enable real payments."
          : deal.priceCurrency === "NIM"
            ? "Open this page inside Nimiq Pay to pay with NIM. Funds go to the XcrowHub custody address and are released when the deal confirms."
            : "Pay with USDT via your connected EVM wallet. Funds go to the XcrowHub custody address and are released when the deal confirms."}
      </p>
    </section>
  );
}
