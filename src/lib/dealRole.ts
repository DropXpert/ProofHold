import type { Deal, DealStatus } from "@/types/deal";
import type { AuthSession } from "@/lib/auth";

export type DealRole = "buyer" | "seller" | "admin" | "observer";

function norm(addr: string | undefined | null): string {
  return (addr ?? "").replace(/\s+/g, "").toLowerCase();
}

/**
 * Derive the viewer's role on a specific deal from their connected wallet —
 * never a manual toggle. Admins are recognised by their session role; buyers
 * and sellers by matching the deal's recorded addresses.
 *
 * Before payment the buyer isn't recorded yet, so any connected non-seller
 * holding the link is treated as the prospective buyer (so they can pay).
 */
export function resolveDealRole(deal: Deal, session: AuthSession | null): DealRole {
  if (session?.role === "admin") return "admin";

  const me = norm(session?.address);
  if (!me) return "observer";

  if (norm(deal.sellerWalletAddress) === me) return "seller";

  if (deal.buyerWalletAddress) {
    return norm(deal.buyerWalletAddress) === me ? "buyer" : "observer";
  }

  // No buyer recorded yet (awaiting payment): the connected non-seller is the
  // prospective buyer who opened the payment link.
  return "buyer";
}

/** True when the address is the buyer or seller on this deal. */
export function isParticipant(deal: Deal, addr: string | undefined): boolean {
  const me = norm(addr);
  if (!me) return false;
  return norm(deal.sellerWalletAddress) === me || norm(deal.buyerWalletAddress) === me;
}

/** Whether the deal is currently waiting on an action from this role. */
export function dealNeedsAction(deal: Deal, role: DealRole): boolean {
  const s: DealStatus = deal.status;
  if (role === "seller") {
    return s === "awaiting_payment" || s === "funds_held" || s === "proof_window";
  }
  if (role === "buyer") {
    return s === "delivered_by_seller" || s === "proof_window";
  }
  return false;
}
