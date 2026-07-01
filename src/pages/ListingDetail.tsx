import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Clock, Star, Pause, Play, Trash2, Tag, Inbox } from "lucide-react";
import { useListingStore } from "@/store/listingStore";
import { useDealStore } from "@/store/dealStore";
import { useAuthStore } from "@/store/authStore";
import { useOfferStore, isActiveOffer, isExpiredOffer, type Offer, type OfferStatus } from "@/store/offerStore";
import { PageHeader } from "@/components/PageHeader";
import { CategoryTag } from "@/components/CategoryTag";
import { WalletAddressBadge } from "@/components/WalletAddressBadge";
import { MakeOfferForm } from "@/components/MakeOfferForm";
import { OfferCard } from "@/components/OfferCard";
import {
  ACTIVE_DEAL_LIMIT,
  ACTIVE_DEAL_LIMIT_MESSAGE,
  countActiveSellerDeals,
} from "@/lib/dealLimits";

// Seller inbox ordering: things that need action first, resolved last.
const STATUS_RANK: Record<OfferStatus, number> = {
  pending: 0,
  countered: 1,
  accepted: 2,
  declined: 3,
  withdrawn: 4,
  expired: 5,
};

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getListing = useListingStore((s) => s.getListing);
  const fetchAll = useListingStore((s) => s.fetchAll);
  const toggleStatus = useListingStore((s) => s.toggleStatus);
  const deleteListing = useListingStore((s) => s.deleteListing);
  const createDeal = useDealStore((s) => s.createDeal);
  const dealsMap = useDealStore((s) => s.deals);
  const session = useAuthStore((s) => s.session);

  const offers = useOfferStore((s) => (id ? s.byListing[id] : undefined));
  const fetchForListing = useOfferStore((s) => s.fetchForListing);
  const subscribeForListing = useOfferStore((s) => s.subscribeForListing);
  const placeOffer = useOfferStore((s) => s.placeOffer);
  const withdrawOffer = useOfferStore((s) => s.withdraw);
  const declineOffer = useOfferStore((s) => s.decline);
  const counterOffer = useOfferStore((s) => s.counter);
  const markAccepted = useOfferStore((s) => s.markAccepted);

  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const buyLock = useRef(false);
  const offerSubmitLock = useRef(false);
  const offerActionLock = useRef<string | null>(null);
  const manageActionLock = useRef(false);

  useEffect(() => {
    if (!getListing(id ?? "")) fetchAll();
  }, [id]);

  // Load offers + subscribe to live changes for this listing.
  useEffect(() => {
    if (!id) return;
    fetchForListing(id);
    const unsub = subscribeForListing(id, () => {});
    return unsub;
  }, [id, fetchForListing, subscribeForListing]);

  const listing = getListing(id ?? "");
  const myAddr = session?.address.toLowerCase();
  const isOwner = !!myAddr && myAddr === listing?.sellerAddr.toLowerCase();

  const allOffers = useMemo(() => offers ?? [], [offers]);

  // Seller's incoming offers, action-needed first.
  const incoming = useMemo(() => {
    return [...allOffers].sort((a, b) => {
      const ra = isExpiredOffer(a) ? STATUS_RANK.expired : STATUS_RANK[a.status];
      const rb = isExpiredOffer(b) ? STATUS_RANK.expired : STATUS_RANK[b.status];
      return ra !== rb ? ra - rb : b.createdAt.localeCompare(a.createdAt);
    });
  }, [allOffers]);

  // Buyer's own current offer on this listing (active or accepted).
  const myOffer = useMemo(() => {
    if (!myAddr) return null;
    const mine = allOffers
      .filter((o) => o.buyerAddr.toLowerCase() === myAddr)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return mine.find((o) => isActiveOffer(o) || o.status === "accepted") ?? null;
  }, [allOffers, myAddr]);

  const activeSellerDeals = useMemo(
    () => (listing ? countActiveSellerDeals(Object.values(dealsMap), listing.sellerAddr) : 0),
    [dealsMap, listing]
  );
  const sellerDealLimitReached = activeSellerDeals >= ACTIVE_DEAL_LIMIT;

  if (!listing) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Listing" title="Not found" back="/listings" />
        <div className="card px-5 py-10 text-center text-[11px] text-muted">
          This listing doesn't exist or was removed.
        </div>
      </div>
    );
  }

  const l = listing;

  async function handleBuy() {
    if (buyLock.current || buying) return;
    buyLock.current = true;
    setBuying(true);
    setBuyError(null);
    try {
      if (sellerDealLimitReached) {
        throw new Error(ACTIVE_DEAL_LIMIT_MESSAGE);
      }
      const deal = await createDeal({
        title: l.title,
        description: l.description,
        priceAmount: l.priceAmount,
        priceCurrency: l.priceCurrency,
        category: l.category,
        sellerWalletAddress: l.sellerAddr,
        deliveryDeadlineHours: l.deliveryHours,
        confirmationWindowHours: l.confirmationHours,
        requiredDeliveryProof: l.requiredDeliveryProof,
        refundTerms: l.refundTerms,
        listingId: l.id,
      });
      // Order count is credited on release (see dealStore.creditOrderOnRelease),
      // not here — abandoned/unpaid deals must not inflate a seller's record.
      navigate(`/deal/${deal.id}/pay`);
    } catch (err: any) {
      setBuyError(err.message ?? "Failed to create deal.");
    } finally {
      setBuying(false);
      buyLock.current = false;
    }
  }

  async function handlePlaceOffer(amount: string, message: string) {
    if (!session || isOwner) return;
    if (offerSubmitLock.current || offerSubmitting) return;
    offerSubmitLock.current = true;
    setOfferSubmitting(true);
    setOfferError(null);
    try {
      await placeOffer({
        listingId: l.id,
        buyerAddr: session.address,
        sellerAddr: l.sellerAddr,
        currency: l.priceCurrency,
        amount,
        message,
      });
      setShowOfferForm(false);
    } catch (err: any) {
      setOfferError(err.message ?? "Failed to send offer.");
    } finally {
      setOfferSubmitting(false);
      offerSubmitLock.current = false;
    }
  }

  // Shared accept path for both seller (accepts buyer offer) and buyer
  // (accepts seller counter): create the escrow deal at the agreed price, then
  // link it to the offer. Cross-party notification is delivered via realtime.
  async function handleAcceptOffer(offer: Offer) {
    if (offerActionLock.current) return;
    if (isExpiredOffer(offer)) {
      setOfferError("This offer has expired.");
      return;
    }
    offerActionLock.current = offer.id;
    setBusyOfferId(offer.id);
    setOfferError(null);
    try {
      if (sellerDealLimitReached) {
        throw new Error(ACTIVE_DEAL_LIMIT_MESSAGE);
      }
      const deal = await createDeal({
        title: l.title,
        description: l.description,
        priceAmount: offer.currentAmount,
        priceCurrency: offer.currency,
        category: l.category,
        sellerWalletAddress: l.sellerAddr,
        deliveryDeadlineHours: l.deliveryHours,
        confirmationWindowHours: l.confirmationHours,
        requiredDeliveryProof: l.requiredDeliveryProof,
        refundTerms: l.refundTerms,
        listingId: l.id,
      });
      if (!deal?.id) throw new Error("Could not create the deal.");
      await markAccepted(offer.id, deal.id);

      // The buyer pays. If the buyer accepted the counter, take them straight there.
      if (myAddr === offer.buyerAddr.toLowerCase()) {
        navigate(`/deal/${deal.id}/pay`);
      }
    } catch (err: any) {
      setOfferError(err.message ?? "Failed to accept offer.");
    } finally {
      setBusyOfferId(null);
      offerActionLock.current = null;
    }
  }

  async function runOfferAction(offerId: string, fn: () => Promise<void>) {
    if (offerActionLock.current) return;
    offerActionLock.current = offerId;
    setBusyOfferId(offerId);
    setOfferError(null);
    try {
      await fn();
    } catch (err: any) {
      setOfferError(err.message ?? "Action failed.");
    } finally {
      setBusyOfferId(null);
      offerActionLock.current = null;
    }
  }

  async function handleDelete() {
    if (manageActionLock.current) return;
    manageActionLock.current = true;
    try {
      await deleteListing(l.id);
      navigate("/listings");
    } finally {
      manageActionLock.current = false;
    }
  }

  async function handleToggleStatus() {
    if (manageActionLock.current) return;
    manageActionLock.current = true;
    try {
      await toggleStatus(l.id, l.status === "active" ? "paused" : "active");
    } finally {
      manageActionLock.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Listing" title="" back="/listings" />

      {/* Main card */}
      <section className="card px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[16px] font-bold leading-snug text-ink flex-1">{l.title}</h1>
          <div className="shrink-0 text-right">
            <p className="text-[18px] font-bold tabular-nums text-ink leading-none">{l.priceAmount}</p>
            <p className="text-[10.5px] text-muted mt-0.5">{l.priceCurrency}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CategoryTag category={l.category} />
          {l.tags.map((t) => (
            <span key={t} className="pill border-edge bg-bg text-muted text-[10px]">#{t}</span>
          ))}
        </div>

        {l.description && (
          <p className="text-[11.5px] leading-relaxed text-ink whitespace-pre-wrap">{l.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-edge bg-bg px-4 py-3">
          <div className="space-y-0.5">
            <p className="field-label">Delivery</p>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <Clock className="h-3.5 w-3.5 text-muted" />
              {l.deliveryHours}h deadline
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="field-label">Escrow</p>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Protected
            </div>
          </div>
          {l.ordersCount > 0 && (
            <div className="space-y-0.5">
              <p className="field-label">Orders</p>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
                <Star className="h-3.5 w-3.5 text-warning" />
                {l.ordersCount} completed
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Seller info */}
      <section className="card px-5 py-4 flex items-center gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="field-label">Seller</p>
          <WalletAddressBadge address={l.sellerAddr} />
        </div>
        <Link to={`/profile/${encodeURIComponent(l.sellerAddr)}`} className="btn-secondary text-[10.5px] px-3 py-2 shrink-0">
          View profile
        </Link>
      </section>

      {/* Delivery proof terms */}
      <section className="card px-5 py-4 space-y-2">
        <p className="text-[11px] font-semibold text-ink">What counts as delivery</p>
        <p className="text-[11px] text-muted leading-relaxed">{l.requiredDeliveryProof}</p>
      </section>

      <section className="card px-5 py-4 space-y-2">
        <p className="text-[11px] font-semibold text-ink">Refund terms</p>
        <p className="text-[11px] text-muted leading-relaxed">{l.refundTerms}</p>
      </section>

      {/* ── Buyer view ───────────────────────────────────────────────────── */}
      {!isOwner && (
        <div className="space-y-3">
          {/* The buyer's own active/accepted offer, if any */}
          {myOffer && (
            <OfferCard
              offer={myOffer}
              viewer="buyer"
              busy={busyOfferId === myOffer.id}
              onAccept={() => handleAcceptOffer(myOffer)}
              onDecline={() => runOfferAction(myOffer.id, () => declineOffer(myOffer.id))}
              onWithdraw={() => runOfferAction(myOffer.id, () => withdrawOffer(myOffer.id))}
            />
          )}

          {offerError && <p className="text-[10.5px] text-danger">{offerError}</p>}

          {/* Make-an-offer form */}
          {!myOffer && showOfferForm && session && (
            <MakeOfferForm
              listPrice={l.priceAmount}
              currency={l.priceCurrency}
              submitting={offerSubmitting}
              error={offerError}
              onSubmit={handlePlaceOffer}
              onCancel={() => setShowOfferForm(false)}
            />
          )}

          {/* Buy / Make offer CTAs (hidden once an offer is accepted) */}
          {(!myOffer || myOffer.status !== "accepted") && !showOfferForm && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBuy}
                disabled={buying || l.status !== "active" || sellerDealLimitReached}
                className="btn-primary w-full"
              >
                <ShieldCheck className="h-4 w-4" />
                {buying
                  ? "Creating deal..."
                  : l.status !== "active"
                  ? "Listing paused"
                  : sellerDealLimitReached
                  ? "Seller is at deal limit"
                  : `Buy now for ${l.priceAmount} ${l.priceCurrency}`}
              </button>

              {!myOffer && session && l.status === "active" && (
                <button
                  type="button"
                  onClick={() => { setShowOfferForm(true); setOfferError(null); }}
                  className="btn-secondary w-full"
                >
                  <Tag className="h-4 w-4" />
                  Make an offer
                </button>
              )}

              {buyError && <p className="text-[10.5px] text-danger">{buyError}</p>}
              {!session && (
                <p className="text-center text-[10.5px] text-muted">Connect your wallet to buy or make an offer.</p>
              )}
              {session && (
                <p className={`text-center text-[10.5px] ${sellerDealLimitReached ? "text-danger" : "text-muted"}`}>
                  {sellerDealLimitReached
                    ? ACTIVE_DEAL_LIMIT_MESSAGE
                    : "Funds held in escrow. Released only on delivery."}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Seller view ──────────────────────────────────────────────────── */}
      {isOwner && (
        <>
          {/* Incoming offers */}
          <section className="card px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-accent" />
              <h3 className="text-[12px] font-semibold text-ink">Offers</h3>
              {incoming.length > 0 && (
                <span className="pill border-edge bg-bg text-[10px] text-muted">{incoming.length}</span>
              )}
            </div>

            {offerError && <p className="text-[10.5px] text-danger">{offerError}</p>}

            {incoming.length === 0 ? (
              <p className="text-[11px] text-muted">No offers yet. They'll appear here in real time.</p>
            ) : (
              <ul className="space-y-2.5">
                {incoming.map((o) => (
                  <li key={o.id}>
                    <OfferCard
                      offer={o}
                      viewer="seller"
                      busy={busyOfferId === o.id}
                      onAccept={() => handleAcceptOffer(o)}
                      onDecline={() => runOfferAction(o.id, () => declineOffer(o.id))}
                      onCounter={(amount) => runOfferAction(o.id, () => counterOffer(o.id, amount))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Manage listing */}
          <section className="card px-5 py-4 space-y-3">
            <p className="text-[11px] font-semibold text-ink">Manage listing</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleToggleStatus}
                className="btn-secondary w-full text-[11px]"
              >
                {l.status === "active"
                  ? <><Pause className="h-4 w-4" />Pause</>
                  : <><Play className="h-4 w-4" />Activate</>}
              </button>

              {confirmingDelete ? (
                <button type="button" onClick={handleDelete} className="btn-danger w-full text-[11px]">
                  <Trash2 className="h-4 w-4" />
                  Confirm delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="btn-danger w-full text-[11px]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
            {confirmingDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-[10.5px] text-muted hover:text-ink transition"
              >
                Cancel
              </button>
            )}
            <div className={`rounded-lg px-3 py-2 text-[10.5px] text-center ${l.status === "active" ? "bg-accent-soft text-accent-ink" : "bg-warning/10 text-warning"}`}>
              {l.status === "active" ? "Live, buyers can purchase" : "Paused, hidden from browse"}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
