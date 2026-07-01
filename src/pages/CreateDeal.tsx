import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useDealStore } from "@/store/dealStore";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/Field";
import { WalletAddressBadge } from "@/components/WalletAddressBadge";
import { isCustodyAddress } from "@/lib/config";
import {
  ACTIVE_DEAL_LIMIT,
  ACTIVE_DEAL_LIMIT_MESSAGE,
  countActiveSellerDeals,
} from "@/lib/dealLimits";
import type { Currency, DealCategory } from "@/types/deal";
import { DEAL_CATEGORIES, CATEGORY_LABELS } from "@/types/deal";

interface FormState {
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: Currency;
  category: DealCategory;
  deliveryDeadlineHours: string;
  confirmationWindowHours: string;
  requiredDeliveryProof: string;
  refundTerms: string;
}

const initialState: FormState = {
  title: "",
  description: "",
  priceAmount: "",
  priceCurrency: "USDT",
  category: "other",
  deliveryDeadlineHours: "48",
  confirmationWindowHours: "24",
  requiredDeliveryProof: "",
  refundTerms: "",
};

export default function CreateDeal() {
  const navigate = useNavigate();
  const createDeal = useDealStore((s) => s.createDeal);
  const dealsMap = useDealStore((s) => s.deals);
  const loadFromSupabase = useDealStore((s) => s.loadFromSupabase);
  const session = useAuthStore((s) => s.session);
  const connect = useAuthStore((s) => s.connect);
  const authLoading = useAuthStore((s) => s.loading);
  const [form, setForm] = useState<FormState>(initialState);
  const [sellerAddress, setSellerAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    void loadFromSupabase({ force: true });
  }, [loadFromSupabase]);

  useEffect(() => {
    // Use already-connected session address — avoids re-prompting the wallet
    if (session?.address && session.currency === form.priceCurrency) {
      setSellerAddress(session.address);
      return;
    }
    setSellerAddress("");
  }, [form.priceCurrency, session?.address, session?.currency]);

  const activeDealCount = useMemo(
    () => countActiveSellerDeals(Object.values(dealsMap), sellerAddress),
    [dealsMap, sellerAddress]
  );
  const activeDealLimitReached =
    sellerAddress.length > 0 && activeDealCount >= ACTIVE_DEAL_LIMIT;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Double-submit guard: ref (sync) + state (UI)
    if (submitLock.current || submitting) return;

    if (!form.title.trim()) return setError("Add a short title.");
    if (!form.priceAmount.trim() || Number(form.priceAmount) <= 0)
      return setError("Add a price greater than zero.");
    if (!form.requiredDeliveryProof.trim())
      return setError("Describe what counts as delivery.");
    if (!form.refundTerms.trim()) return setError("Add refund terms.");
    submitLock.current = true;
    setSubmitting(true);
    try {
      let nextSellerAddress = sellerAddress;
      if (!nextSellerAddress) {
        await connect(form.priceCurrency);
        const nextSession = useAuthStore.getState().session;
        if (nextSession?.currency === form.priceCurrency) {
          nextSellerAddress = nextSession.address;
          setSellerAddress(nextSellerAddress);
        }
      }
      if (!nextSellerAddress) {
        throw new Error(`Connect a ${form.priceCurrency} wallet first.`);
      }
      if (isCustodyAddress(form.priceCurrency, nextSellerAddress)) {
        throw new Error("Use your seller wallet, not the XcrowHub custody address.");
      }
      if (
        countActiveSellerDeals(
          Object.values(useDealStore.getState().deals),
          nextSellerAddress
        ) >= ACTIVE_DEAL_LIMIT
      ) {
        throw new Error(ACTIVE_DEAL_LIMIT_MESSAGE);
      }

      const deliveryHours = Math.max(1, Math.round(Number(form.deliveryDeadlineHours) || 48));
      const confirmHours = Math.max(1, Math.round(Number(form.confirmationWindowHours) || 24));

      const deal = await Promise.resolve(createDeal({
        title: form.title,
        description: form.description,
        priceAmount: String(Number(form.priceAmount)),
        priceCurrency: form.priceCurrency,
        category: form.category,
        sellerWalletAddress: nextSellerAddress,
        deliveryDeadlineHours: deliveryHours,
        confirmationWindowHours: confirmHours,
        requiredDeliveryProof: form.requiredDeliveryProof,
        refundTerms: form.refundTerms,
      }));

      navigate(`/deal/${deal.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to create deal. Please try again.");
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="New deal"
        title="Create protected payment link"
        back="/create"
      />

      <form onSubmit={submit} className="space-y-5">
        <section className="card space-y-4 px-5 py-5">
          <Field
            label="What are you selling?"
            required
            hint="Plain-language title. The buyer will see this."
          >
            <input
              className="input"
              placeholder="Logo design final files"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength={120}
            />
          </Field>

          <Field
            label="Description"
            hint="Optional. Extra details the buyer should know."
          >
            <textarea
              className="textarea"
              placeholder="Brand mark + wordmark, final exports in PNG / SVG / PDF."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={500}
            />
          </Field>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Price" required>
              <input
                className="input tabular-nums"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="20"
                value={form.priceAmount}
                onChange={(e) => update("priceAmount", e.target.value)}
              />
            </Field>
            <Field label="Currency">
              <select
                className="select"
                value={form.priceCurrency}
                onChange={(e) =>
                  update("priceCurrency", e.target.value as Currency)
                }
              >
                <option value="USDT">USDT</option>
                <option value="NIM">NIM</option>
              </select>
            </Field>
          </div>

          <Field label="Category" hint="Helps buyers find and trust your listing.">
            <select
              className="select"
              value={form.category}
              onChange={(e) => update("category", e.target.value as DealCategory)}
            >
              {DEAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section className="card space-y-4 px-5 py-5">
          <Field
            label="What counts as delivery?"
            required
            hint="Be specific. This is what the buyer will check against."
          >
            <textarea
              className="textarea"
              placeholder="Figma link + exported final files (PNG, SVG)"
              value={form.requiredDeliveryProof}
              onChange={(e) =>
                update("requiredDeliveryProof", e.target.value)
              }
              maxLength={400}
            />
          </Field>

          <Field
            label="Refund terms"
            required
            hint="What conditions trigger a refund?"
          >
            <textarea
              className="textarea"
              placeholder="Refund if files are not delivered within 48 hours."
              value={form.refundTerms}
              onChange={(e) => update("refundTerms", e.target.value)}
              maxLength={400}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery deadline (hrs)" required>
              <input
                className="input tabular-nums"
                type="number"
                min="1"
                step="1"
                value={form.deliveryDeadlineHours}
                onChange={(e) =>
                  update("deliveryDeadlineHours", e.target.value)
                }
              />
            </Field>
            <Field label="Confirmation window (hrs)" required>
              <input
                className="input tabular-nums"
                type="number"
                min="1"
                step="1"
                value={form.confirmationWindowHours}
                onChange={(e) =>
                  update("confirmationWindowHours", e.target.value)
                }
              />
            </Field>
          </div>
        </section>

        <section className="card flex items-center justify-between gap-3 px-5 py-4">
          <div className="space-y-0.5">
            <p className="field-label">Receive payment to</p>
            <p className="text-[11px] text-muted">
              Your connected wallet address.
            </p>
          </div>
          {sellerAddress ? (
            <WalletAddressBadge address={sellerAddress} />
          ) : authLoading ? (
            <span className="text-[10.5px] text-muted">Connecting...</span>
          ) : (
            <button
              type="button"
              className="btn-secondary shrink-0 px-3 py-2 text-[10.5px]"
              onClick={() => connect(form.priceCurrency)}
            >
              Connect {form.priceCurrency}
            </button>
          )}
        </section>

        {sellerAddress ? (
          <p
            className={`text-[10.5px] ${
              activeDealLimitReached ? "text-danger" : "text-muted"
            }`}
          >
            {activeDealLimitReached
              ? ACTIVE_DEAL_LIMIT_MESSAGE
              : `${activeDealCount}/${ACTIVE_DEAL_LIMIT} active deals for this wallet.`}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting || authLoading || activeDealLimitReached}
        >
          {submitting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Lock className="h-4 w-4" />}
          {submitting ? "Creating…" : "Create protected payment link"}
        </button>
      </form>
    </div>
  );
}
