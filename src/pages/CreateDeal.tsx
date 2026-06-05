import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useDealStore } from "@/store/dealStore";
import { getWallet } from "@/wallet";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/Field";
import { WalletAddressBadge } from "@/components/WalletAddressBadge";
import type { Currency } from "@/types/deal";

interface FormState {
  title: string;
  description: string;
  priceAmount: string;
  priceCurrency: Currency;
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
  deliveryDeadlineHours: "48",
  confirmationWindowHours: "24",
  requiredDeliveryProof: "",
  refundTerms: "",
};

export default function CreateDeal() {
  const navigate = useNavigate();
  const createDeal = useDealStore((s) => s.createDeal);
  const [form, setForm] = useState<FormState>(initialState);
  const [sellerAddress, setSellerAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallet()
      .then((w) => w.getAddress())
      .then(setSellerAddress)
      .catch(() => setSellerAddress(""));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError("Add a short title.");
    if (!form.priceAmount.trim() || Number(form.priceAmount) <= 0)
      return setError("Add a price greater than zero.");
    if (!form.requiredDeliveryProof.trim())
      return setError("Describe what counts as delivery.");
    if (!form.refundTerms.trim()) return setError("Add refund terms.");
    if (!sellerAddress) return setError("Connect a wallet first.");

    const deliveryHours = Math.max(1, Math.round(Number(form.deliveryDeadlineHours) || 48));
    const confirmHours = Math.max(1, Math.round(Number(form.confirmationWindowHours) || 24));

    const deal = createDeal({
      title: form.title,
      description: form.description,
      priceAmount: String(Number(form.priceAmount)),
      priceCurrency: form.priceCurrency,
      sellerWalletAddress: sellerAddress,
      deliveryDeadlineHours: deliveryHours,
      confirmationWindowHours: confirmHours,
      requiredDeliveryProof: form.requiredDeliveryProof,
      refundTerms: form.refundTerms,
    });

    navigate(`/deal/${deal.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="New deal"
        title="Create protected payment link"
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
            <p className="text-[13px] text-muted">
              Your connected wallet address.
            </p>
          </div>
          {sellerAddress ? (
            <WalletAddressBadge address={sellerAddress} />
          ) : (
            <span className="text-[12px] text-muted">Connecting…</span>
          )}
        </section>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary w-full">
          <Lock className="h-4 w-4" />
          Create protected payment link
        </button>
      </form>
    </div>
  );
}
