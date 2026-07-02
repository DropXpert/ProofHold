import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, X, Camera, Package, ShieldCheck, Gift, ChevronRight } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Progress, ProgressTrack } from "@/components/ui/progress";
import { useDealStore } from "@/store/dealStore";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { useListingStore } from "@/store/listingStore";
import { PageHeader } from "@/components/PageHeader";
import { DealCard } from "@/components/DealCard";
import { StarRating } from "@/components/StarRating";
import { FeedbackCard } from "@/components/FeedbackCard";
import { TrustBadge } from "@/components/TrustBadge";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { TelegramConnectCard } from "@/components/TelegramConnectCard";

type HistoryTab = "seller" | "buyer" | "listings";

function shortenAddr(addr: string) {
  const c = addr.replace(/\s+/g, "");
  return c.length <= 16 ? addr : `${c.slice(0, 8)}…${c.slice(-6)}`;
}

async function resizeImageToDataUrl(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function Profile() {
  const { address } = useParams<{ address: string }>();
  const addr = decodeURIComponent(address ?? "");

  const session = useAuthStore((s) => s.session);
  const isOwn = !!session && session.address.toLowerCase() === addr.toLowerCase();
  const isAdmin = isOwn && session?.role === "admin";

  const deals = useDealStore((s) => s.deals);
  const getFeedbacksForAddress = useDealStore((s) => s.getFeedbacksForAddress);

  const getProfile = useProfileStore((s) => s.getProfile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const profile = getProfile(addr);
  const fetchMine = useListingStore((s) => s.fetchMine);
  const myListings = useListingStore((s) => s.myListings);

  useEffect(() => {
    if (addr) fetchMine(addr);
  }, [addr, fetchMine]);

  const [tab, setTab] = useState<HistoryTab>("seller");
  const [editing, setEditing] = useState(false);
  const [draftUsername, setDraftUsername] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receivedFeedbacks = useMemo(
    () =>
      getFeedbacksForAddress(addr).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
    [addr, getFeedbacksForAddress]
  );

  const allDeals = useMemo(() => Object.values(deals), [deals]);

  const asSeller = useMemo(
    () =>
      allDeals
        .filter(
          (d) => d.sellerWalletAddress.toLowerCase() === addr.toLowerCase()
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allDeals, addr]
  );

  const asBuyer = useMemo(
    () =>
      allDeals
        .filter(
          (d) => d.buyerWalletAddress?.toLowerCase() === addr.toLowerCase()
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allDeals, addr]
  );

  const stats = useMemo(() => {
    const completed =
      asSeller.filter((d) =>
        ["released", "refunded", "partially_refunded"].includes(d.status)
      ).length +
      asBuyer.filter((d) =>
        ["released", "refunded", "partially_refunded"].includes(d.status)
      ).length;

    const disputed = [...asSeller, ...asBuyer].filter((d) =>
      [
        "proof_window",
        "under_admin_review",
        "refunded",
        "partially_refunded",
      ].includes(d.status)
    ).length;

    const total = asSeller.length + asBuyer.length;
    const disputeRate = total > 0 ? Math.round((disputed / total) * 100) : 0;

    const avgRating = receivedFeedbacks.length
      ? receivedFeedbacks.reduce((s, f) => s + f.rating, 0) /
        receivedFeedbacks.length
      : 0;

    const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: receivedFeedbacks.filter((f) => f.rating === star).length,
    }));

    return { completed, disputed, disputeRate, avgRating, ratingDist };
  }, [asSeller, asBuyer, receivedFeedbacks]);

  function startEdit() {
    setDraftUsername(profile.username);
    setEditing(true);
  }

  function saveEdit() {
    setProfile(addr, { username: draftUsername.trim().slice(0, 32) });
    setEditing(false);
  }

  const handlePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageToDataUrl(file, 256);
        setProfile(addr, { avatarDataUrl: dataUrl });
      } catch {
        // ignore
      }
      e.target.value = "";
    },
    [addr, setProfile]
  );

  const historyList = tab === "seller" ? asSeller : asBuyer;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Profile" title="Trader profile" />

      {/* Identity card */}
      <section className="card px-5 py-5 space-y-4">
        <div className="flex items-start gap-3">
          {/* Avatar + camera overlay */}
          <div className="relative shrink-0">
            <ProfileAvatar
              address={addr}
              size="lg"
              avatarDataUrl={profile.avatarDataUrl}
            />
            {isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition"
                  title="Change photo"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Username row */}
            <div className="flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    autoFocus
                    className="input h-7 text-[14px] py-0 flex-1 min-w-0"
                    placeholder="Username (max 32 chars)"
                    value={draftUsername}
                    maxLength={32}
                    onChange={(e) => setDraftUsername(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditing(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-[12.5px] font-medium text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="shrink-0 text-muted hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  {profile.username ? (
                    <span className="text-[15px] font-semibold text-ink leading-none">
                      {profile.username}
                    </span>
                  ) : isOwn ? (
                    <span className="text-[13px] text-muted italic">
                      No username set
                    </span>
                  ) : null}
                  {isOwn && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="shrink-0 text-muted hover:text-ink transition"
                      title="Edit username"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <TrustBadge
                count={receivedFeedbacks.length}
                avg={stats.avgRating}
              />
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-md border border-accent bg-accent px-2 py-0.5 text-[12px] font-semibold text-white">
                  <ShieldCheck className="h-3 w-3" />
                  Admin
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] text-muted truncate">
                {shortenAddr(addr)}
              </span>
              <CopyButton text={addr} />
            </div>
          </div>
        </div>

        {/* Remove photo button */}
        {isOwn && profile.avatarDataUrl && (
          <button
            type="button"
            onClick={() => setProfile(addr, { avatarDataUrl: null })}
            className="text-[12.5px] text-danger hover:underline"
          >
            Remove photo
          </button>
        )}
      </section>

      {/* Stats grid */}
      <section className="card px-5 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          {[
            { label: "Total deals", value: asSeller.length + asBuyer.length },
            { label: "Completed", value: stats.completed },
            {
              label: "Avg rating",
              value: receivedFeedbacks.length
                ? stats.avgRating.toFixed(1) + " ★"
                : "n/a",
            },
            { label: "Dispute rate", value: `${stats.disputeRate}%` },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <p className="text-[19px] font-semibold tabular-nums text-ink leading-none">
                {value}
              </p>
              <p className="field-label">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Refer & earn (own profile only) */}
      {isOwn && (
        <Link
          to="/referral"
          className="card flex items-center gap-3 px-5 py-4 transition hover:bg-bg"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Gift className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">Refer &amp; earn</p>
            <p className="text-[13px] text-muted">
              Earn 10% of the fee on every sale your referrals make.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      )}

      {/* Telegram notifications (own profile only) */}
      {isOwn && <TelegramConnectCard />}

      {/* Rating distribution */}
      {receivedFeedbacks.length > 0 && (
        <section className="card px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Ratings</h3>
            <div className="flex items-center gap-1.5">
              <StarRating value={Math.round(stats.avgRating)} size="sm" />
              <span className="text-[13px] font-semibold text-ink">
                {stats.avgRating.toFixed(1)}
              </span>
              <span className="text-[12.5px] text-muted">
                ({receivedFeedbacks.length})
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {stats.ratingDist.map(({ star, count }) => {
              const pct = receivedFeedbacks.length
                ? Math.round((count / receivedFeedbacks.length) * 100)
                : 0;
              return (
                <div
                  key={star}
                  className="flex items-center gap-2 text-[12.5px]"
                >
                  <span className="w-3 text-right text-muted">{star}</span>
                  <span className="text-warning">★</span>
                  <Progress value={pct} className="flex-1" aria-label={`${star} star ratings`}>
                    <ProgressTrack className="h-1.5 bg-edge" indicatorClassName="bg-warning" />
                  </Progress>
                  <span className="w-7 text-right text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Feedback wall */}
      {receivedFeedbacks.length > 0 && (
        <section className="card px-5 py-4 space-y-3">
          <h3 className="text-[15px] font-semibold text-ink">
            Feedback ({receivedFeedbacks.length})
          </h3>
          <ul className="space-y-3">
            {receivedFeedbacks.slice(0, 10).map((f) => (
              <li key={f.id}>
                <FeedbackCard feedback={f} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {receivedFeedbacks.length === 0 && (
        <div className="card px-5 py-6 text-center space-y-1">
          <p className="text-[14px] font-medium text-ink">No feedback yet</p>
          <p className="text-[13px] text-muted">
            Feedback appears after deals are finalized.
          </p>
        </div>
      )}

      {/* Deal history + Listings */}
      <section className="card overflow-hidden">
        <div className="flex border-b border-edge">
          {(["seller", "buyer", "listings"] as HistoryTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[12.5px] font-medium transition ${
                tab === t
                  ? "text-accent border-b-2 border-accent -mb-px"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t === "listings" ? `Listings (${myListings.filter(l => l.status !== "deleted").length})` : `As ${t} (${t === "seller" ? asSeller.length : asBuyer.length})`}
            </button>
          ))}
        </div>

        {tab === "listings" ? (
          myListings.filter(l => l.status !== "deleted").length === 0 ? (
            <div className="px-5 py-8 text-center space-y-3">
              <p className="text-[13px] text-muted">No listings yet.</p>
              {isOwn && (
                <Link to="/listings/new" className="btn-secondary inline-flex items-center gap-2 text-[13px]">
                  <Package className="h-4 w-4" />
                  Create a listing
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-edge">
              {myListings.filter(l => l.status !== "deleted").map((l) => (
                <li key={l.id}>
                  <Link to={`/listings/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg transition">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink truncate">{l.title}</p>
                      <p className="text-[12px] text-muted">{l.priceAmount} {l.priceCurrency} · {l.ordersCount} orders</p>
                    </div>
                    <span className={`pill text-[12px] shrink-0 ${l.status === "active" ? "border-accent/30 bg-accent-soft text-accent-ink" : "border-edge bg-bg text-muted"}`}>
                      {l.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : historyList.length > 0 ? (
          <ul className="divide-y divide-edge">
            {historyList.slice(0, 20).map((d) => (
              <li key={d.id} className="px-1 py-0.5">
                <DealCard deal={d} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center text-[13px] text-muted">
            No deals as {tab} yet.
          </div>
        )}
      </section>
    </div>
  );
}
