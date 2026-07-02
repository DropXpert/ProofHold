import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, X } from "lucide-react";
import { useListingStore } from "@/store/listingStore";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/Field";
import { ConsentCheck } from "@/components/ConsentCheck";
import { isCustodyAddress } from "@/lib/config";
import type { Currency, DealCategory } from "@/types/deal";
import { DEAL_CATEGORIES, CATEGORY_LABELS } from "@/types/deal";

export default function CreateListing() {
  const navigate = useNavigate();
  const createListing = useListingStore((s) => s.createListing);
  const session = useAuthStore((s) => s.session);
  const connect = useAuthStore((s) => s.connect);
  const authLoading = useAuthStore((s) => s.loading);

  const [sellerAddr, setSellerAddr] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<Currency>("USDT");
  const [category, setCategory] = useState<DealCategory>("other");
  const [deliveryHours, setDeliveryHours] = useState("48");
  const [confirmationHours, setConfirmationHours] = useState("24");
  const [requiredDeliveryProof, setRequiredDeliveryProof] = useState("");
  const [refundTerms, setRefundTerms] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (session?.address && session.currency === priceCurrency) {
      setSellerAddr(session.address);
      return;
    }
    setSellerAddr("");
  }, [session?.address, session?.currency, priceCurrency]);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t) || tags.length >= 5) return;
    setTags([...tags, t]);
    setTagInput("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (submitLock.current || submitting) return;

    if (!title.trim()) return setError("Add a title.");
    if (!priceAmount || Number(priceAmount) <= 0) return setError("Add a price.");
    if (!requiredDeliveryProof.trim()) return setError("Describe what counts as delivery.");
    if (!refundTerms.trim()) return setError("Add refund terms.");
    if (!agreed)
      return setError("Please confirm you understand how escrow works.");

    submitLock.current = true;
    setSubmitting(true);
    try {
      let nextSellerAddr = sellerAddr;
      if (!nextSellerAddr) {
        await connect(priceCurrency);
        const nextSession = useAuthStore.getState().session;
        if (nextSession?.currency === priceCurrency) {
          nextSellerAddr = nextSession.address;
          setSellerAddr(nextSellerAddr);
        }
      }
      if (!nextSellerAddr) {
        throw new Error(`Connect a ${priceCurrency} wallet first.`);
      }
      if (isCustodyAddress(priceCurrency, nextSellerAddr)) {
        throw new Error("Use your seller wallet, not the XcrowHub custody address.");
      }

      const listing = await createListing({
        sellerAddr: nextSellerAddr,
        title: title.trim(),
        description: description.trim(),
        priceAmount: String(Number(priceAmount)),
        priceCurrency,
        category,
        deliveryHours: Math.max(1, Number(deliveryHours) || 48),
        confirmationHours: Math.max(1, Number(confirmationHours) || 24),
        requiredDeliveryProof: requiredDeliveryProof.trim(),
        refundTerms: refundTerms.trim(),
        tags,
      });
      navigate(`/listings/${listing.id}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create listing.");
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Marketplace" title="Create listing" back="/listings" />

      <form onSubmit={submit} className="space-y-5">
        <section className="card space-y-4 px-5 py-5">
          <Field label="Service title" required hint="What are you offering?">
            <input
              className="input"
              placeholder="Logo design, brand identity pack"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          <Field label="Description" hint="Tell buyers what they get, your process, turnaround, etc.">
            <textarea
              className="textarea"
              placeholder="I'll design a complete brand identity including logo, color palette, and typography..."
              value={description}
              maxLength={800}
              onChange={(e) => setDescription(e.target.value)}
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
                placeholder="50"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
              />
            </Field>
            <Field label="Currency">
              <select className="select" value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value as Currency)}>
                <option value="USDT">USDT</option>
                <option value="NIM">NIM</option>
              </select>
            </Field>
          </div>

          <p className="rounded-lg border border-dashed border-edge bg-bg px-3 py-2 text-[13px] leading-relaxed text-muted">
            A 1% platform fee applies only to completed marketplace sales.
            {Number(priceAmount) > 0 ? (
              <>
                {" "}On a {priceAmount} {priceCurrency} sale you receive{" "}
                <span className="font-semibold text-ink tabular-nums">
                  {(Number(priceAmount) * 0.99).toLocaleString(undefined, {
                    maximumFractionDigits: priceCurrency === "NIM" ? 5 : 6,
                  })}{" "}
                  {priceCurrency}
                </span>.
              </>
            ) : (
              " You keep 99% of every sale."
            )}
          </p>

          <Field label="Category">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value as DealCategory)}>
              {DEAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </Field>

          <Field label="Tags" hint="Up to 5 tags. Press Enter to add.">
            <div className="space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[12.5px] text-accent-ink">
                      #{t}
                      <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-muted hover:text-danger">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                  <input
                    className="input pl-8 text-[14px]"
                    placeholder="e.g. figma, branding, logo"
                    value={tagInput}
                    maxLength={20}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    disabled={tags.length >= 5}
                  />
                </div>
                <button type="button" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 5} className="btn-secondary px-3">
                  Add
                </button>
              </div>
            </div>
          </Field>
        </section>

        <section className="card space-y-4 px-5 py-5">
          <Field label="What counts as delivery?" required hint="Buyers will check this.">
            <textarea
              className="textarea"
              placeholder="Figma source file + exported PNG/SVG/PDF files"
              value={requiredDeliveryProof}
              maxLength={400}
              onChange={(e) => setRequiredDeliveryProof(e.target.value)}
            />
          </Field>

          <Field label="Refund terms" required hint="When can buyers request a refund?">
            <textarea
              className="textarea"
              placeholder="Full refund if not delivered within the deadline."
              value={refundTerms}
              maxLength={400}
              onChange={(e) => setRefundTerms(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery deadline (hrs)" required>
              <input className="input tabular-nums" type="number" min="1" value={deliveryHours} onChange={(e) => setDeliveryHours(e.target.value)} />
            </Field>
            <Field label="Confirmation window (hrs)" required>
              <input className="input tabular-nums" type="number" min="1" value={confirmationHours} onChange={(e) => setConfirmationHours(e.target.value)} />
            </Field>
          </div>
        </section>

        <ConsentCheck checked={agreed} onChange={setAgreed} />

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting || authLoading || !agreed}>
          {submitting ? "Publishing..." : "Publish listing"}
        </button>
      </form>
    </div>
  );
}
