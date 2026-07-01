import { useRef, useState } from "react";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import type { Deal } from "@/types/deal";
import { useDealStore } from "@/store/dealStore";
import { useAuthStore } from "@/store/authStore";
import { getWallet } from "@/wallet";
import { isCustodyConfigured, custodyAddressFor } from "@/lib/config";
import { useNavigate } from "react-router-dom";

export function PaymentBox({ deal }: { deal: Deal }) {
  const submitPayment = useDealStore((s) => s.submitPayment);
  const session = useAuthStore((s) => s.session);
  const connect = useAuthStore((s) => s.connect);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const paymentsReady = isCustodyConfigured(deal.priceCurrency);

  async function handlePay() {
    if (inFlight.current || !paymentsReady) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const wallet = await getWallet(deal.priceCurrency);
      let buyer =
        session?.currency === deal.priceCurrency ? session.address : "";
      if (!buyer) {
        await connect(deal.priceCurrency);
        const nextSession = useAuthStore.getState().session;
        buyer =
          nextSession?.currency === deal.priceCurrency
            ? nextSession.address
            : "";
      }
      if (!buyer) {
        throw new Error(`Connect a ${deal.priceCurrency} wallet first.`);
      }
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
      inFlight.current = false;
    }
  }

  function formatPaymentError(err: unknown): string {
    if (isLowBalance(err)) return "Your balance is low for this transaction.";
    if (isRejected(err)) return "Transaction cancelled.";
    if (isAlreadyProcessing(err)) {
      return "A wallet request is already open. Finish it, then try again.";
    }

    const text = errorText(err);
    if (/network|chain|switch/i.test(text)) {
      return "Switch to the required network and try again.";
    }
    if (/wallet|nimiq pay/i.test(text)) return text;
    return "Payment failed. Please try again.";
  }

  function errorText(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const obj = err as Record<string, unknown>;
      const nested = obj.error as Record<string, unknown> | undefined;
      return [obj.message, nested?.message, nested?.reason, obj.reason]
        .filter((m): m is string => typeof m === "string")
        .join(" ");
    }
    return "";
  }

  function isLowBalance(err: unknown): boolean {
    return /insufficient|not enough|low balance|balance is too low|exceeds balance|transfer amount exceeds balance|funds/i.test(
      errorText(err)
    );
  }

  function isRejected(err: unknown): boolean {
    const text = errorText(err);
    if (/user rejected|user denied|rejected by user|cancelled|canceled/i.test(text)) return true;
    if (!err || typeof err !== "object") return false;
    const obj = err as Record<string, unknown>;
    const code = obj.code ?? (obj.error as Record<string, unknown> | undefined)?.code;
    return code === 4001;
  }

  function isAlreadyProcessing(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const obj = err as Record<string, unknown>;
    const code = obj.code ?? (obj.error as Record<string, unknown> | undefined)?.code;
    if (code === -32002) return true;
    return /already (processing|pending|in progress)|request.*(pending|in progress)|transaction already/i.test(
      errorText(err)
    );
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
          <span className="text-[12.5px] uppercase tracking-wider text-muted">
            Amount
          </span>
          <span className="text-[17px] font-semibold tabular-nums text-ink">
            {deal.priceAmount}{" "}
            <span className="text-muted">{deal.priceCurrency}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handlePay}
        disabled={busy || !paymentsReady}
        className="btn-primary w-full"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming payment...
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

      <p className="text-[12.5px] leading-relaxed text-muted">
        {!paymentsReady
          ? "Payments are temporarily unavailable."
          : deal.priceCurrency === "NIM"
            ? "Open this page inside Nimiq Pay to pay with NIM. Funds go to XcrowHub custody and release when the deal confirms."
            : "Pay with USDT via your connected wallet. Funds go to XcrowHub custody and release when the deal confirms."}
      </p>
    </section>
  );
}
