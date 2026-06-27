// Xcrow — Payout trigger Edge Function (hardened)
//
// Moves real funds from the custody hot wallet via the external signer. Because
// this spends money, it must NOT trust the client:
//   * AuthZ — caller must present an admin JWT (app_role=admin) or the internal
//     PAYOUT_INTERNAL_SECRET. Anyone else is rejected.
//   * Recipient + amount are RE-DERIVED from the DB (deal + decisions), never
//     taken from the request body.
//   * The deal must already be in the matching terminal state (set by the
//     admin-gated apply_admin_decision procedure).
//   * Idempotent — an existing outbound tx for (deal_id, recipient) short-circuits.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.2.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNER_URL = Deno.env.get("SIGNER_URL")!;
const SIGNER_SHARED_SECRET = Deno.env.get("SIGNER_SHARED_SECRET")!;
const JWT_SECRET_RAW = Deno.env.get("JWT_SECRET") ?? "";
const PAYOUT_INTERNAL_SECRET = Deno.env.get("PAYOUT_INTERNAL_SECRET") ?? "";
// Uniform cron credential the pg_cron auto-settle sweep sends (Bearer). verify_jwt
// is off — the new API-key gateway rejects legacy service-role JWTs.
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// Marketplace platform fee, in basis points (100 = 1%). Charged only on a full
// release to the seller for deals that originated from a listing. The fee is
// kept by simply paying the seller (10000 - fee_bps)/10000 of the amount and
// leaving the remainder in the custody wallet — no separate transfer. Override
// via the MARKETPLACE_FEE_BPS function secret (set 0 to disable).
const MARKETPLACE_FEE_BPS = Number(Deno.env.get("MARKETPLACE_FEE_BPS") ?? "100");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Decision = "release_to_seller" | "refund_to_buyer" | "partial_refund";

interface PayoutRequest {
  kind?: "deal" | "referral_claim";
  deal_id: string;
  decision: Decision;
  leg?: "seller" | "buyer"; // required for partial_refund
  claim_id?: string; // required for kind=referral_claim
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    if (!(await isAuthorized(req))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as PayoutRequest;

    // Referral claim payouts are a separate money flow (not tied to a deal).
    if (body.kind === "referral_claim") {
      return await handleReferralClaim(body);
    }

    const { deal_id, decision, leg } = body;
    if (!deal_id || !decision) {
      return json({ error: "deal_id and decision are required" }, 400);
    }

    // Re-read the deal from the DB — the source of truth for who gets paid.
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .maybeSingle();
    if (dealErr) throw dealErr;
    if (!deal) return json({ error: "Deal not found" }, 404);

    // The deal must already be in the terminal state the decision implies — that
    // transition is only reachable through the admin-gated procedure.
    const requiredStatus =
      decision === "release_to_seller" ? "released"
      : decision === "refund_to_buyer" ? "refunded"
      : "partially_refunded";
    if (deal.status !== requiredStatus) {
      return json(
        { error: `Deal is not ${requiredStatus} (current: ${deal.status})` },
        409,
      );
    }

    // Derive recipient + amount from the DB, ignoring anything the client sent.
    let toAddress: string;
    let amount: string;

    if (decision === "release_to_seller") {
      toAddress = deal.seller_wallet_address;
      amount = String(deal.price_amount);
    } else if (decision === "refund_to_buyer") {
      toAddress = deal.buyer_wallet_address;
      amount = String(deal.price_amount);
    } else {
      if (leg !== "seller" && leg !== "buyer") {
        return json({ error: "partial_refund requires leg 'seller' | 'buyer'" }, 400);
      }
      const { data: decisionRow, error: decErr } = await supabase
        .from("decisions")
        .select("*")
        .eq("deal_id", deal_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (decErr) throw decErr;
      if (!decisionRow) return json({ error: "No decision on record for this deal" }, 409);

      toAddress = leg === "seller" ? deal.seller_wallet_address : deal.buyer_wallet_address;
      amount = String(leg === "seller" ? decisionRow.seller_amount : decisionRow.buyer_amount);
    }

    if (!toAddress) return json({ error: "Recipient address missing on deal" }, 409);
    if (!(Number(amount) > 0)) return json({ error: "Derived payout amount is not positive" }, 409);

    const currency: "NIM" | "USDT" = deal.price_currency;
    const network: "nimiq" | "evm" = currency === "NIM" ? "nimiq" : "evm";

    // Marketplace platform fee — only on a full release to the seller for a deal
    // that came from a listing. We compute in integer base units (NIM = 5dp,
    // USDT = 6dp) to avoid float dust, round the fee DOWN (favours the seller),
    // pay the net to the seller, and leave the fee in the custody wallet. Direct
    // deals, refunds and partial-refund legs are never charged.
    const decimals = currency === "NIM" ? 5 : 6;
    const baseUnit = 10 ** decimals;
    const isMarketplace = deal.listing_id != null;
    const feeApplies =
      decision === "release_to_seller" && isMarketplace && MARKETPLACE_FEE_BPS > 0;

    let payoutAmount = amount;
    let feeAmount = "0";
    let feeBps = 0;
    if (feeApplies) {
      const grossUnits = Math.round(Number(amount) * baseUnit);
      const feeUnits = Math.floor((grossUnits * MARKETPLACE_FEE_BPS) / 10000);
      const netUnits = grossUnits - feeUnits;
      if (netUnits <= 0) {
        return json({ error: "Net payout after fee is not positive" }, 409);
      }
      feeBps = MARKETPLACE_FEE_BPS;
      feeAmount = (feeUnits / baseUnit).toFixed(decimals);
      payoutAmount = (netUnits / baseUnit).toFixed(decimals);
    }

    // Idempotency: if we already broadcast an outbound tx to this recipient for
    // this deal, return it instead of paying twice.
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("tx_hash")
      .eq("deal_id", deal_id)
      .eq("direction", "out")
      .eq("to_addr", toAddress)
      .limit(1)
      .maybeSingle();
    if (existingTx?.tx_hash) {
      return json({ success: true, txHash: existingTx.tx_hash, idempotent: true });
    }

    console.log(
      `[payout] ${decision}${leg ? `/${leg}` : ""} deal ${deal_id} -> ${payoutAmount} ${currency}` +
        (feeApplies ? ` (gross ${amount}, fee ${feeAmount} @ ${feeBps}bps kept in custody)` : ""),
    );

    const signerRes = await fetch(`${SIGNER_URL}/sign-and-broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SIGNER_SHARED_SECRET}`,
      },
      body: JSON.stringify({ network, currency, to: toAddress, amount: payoutAmount, reference: deal_id }),
    });
    if (!signerRes.ok) {
      const err = await signerRes.text();
      console.error("[payout] signer failed", err);
      return json({ error: "Signer failed", details: err }, 502);
    }

    const { txHash } = await signerRes.json();

    await supabase.from("transactions").insert({
      id: crypto.randomUUID(),
      deal_id,
      direction: "out",
      network,
      amount: Number(payoutAmount),
      currency,
      from_addr: "CUSTODY",
      to_addr: toAddress,
      tx_hash: txHash,
      status: "broadcast",
    });

    const patch: Record<string, string | number> = {};
    if (decision === "release_to_seller" || (decision === "partial_refund" && leg === "seller")) {
      patch.release_tx_hash = txHash;
    }
    if (decision === "refund_to_buyer" || (decision === "partial_refund" && leg === "buyer")) {
      patch.refund_tx_hash = txHash;
    }
    if (feeApplies) {
      patch.fee_amount = Number(feeAmount);
      patch.fee_bps = feeBps;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("deals").update(patch).eq("id", deal_id);
    }

    return json({ success: true, txHash, payoutAmount, feeAmount, feeBps });
  } catch (err) {
    console.error("[payout] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

/**
 * Pay a referrer their accrued referral balance for one currency. The reward
 * comes out of the platform fee already sitting in the custody wallet, so this
 * is just a custody → referrer transfer. Recipient + amount are re-derived from
 * the claim row (never trusted from the client) and the call is idempotent.
 */
async function handleReferralClaim(body: PayoutRequest): Promise<Response> {
  const claimId = body.claim_id;
  if (!claimId) return json({ error: "claim_id is required" }, 400);

  const { data: claim, error: claimErr } = await supabase
    .from("referral_claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (claimErr) throw claimErr;
  if (!claim) return json({ error: "Claim not found" }, 404);

  // Idempotency: already paid → return the existing tx.
  if (claim.status === "paid" && claim.tx_hash) {
    return json({ success: true, txHash: claim.tx_hash, idempotent: true });
  }
  if (claim.status !== "pending") {
    return json({ error: `Claim is not pending (current: ${claim.status})` }, 409);
  }

  const toAddress: string = claim.referrer_addr;
  const amount = String(claim.amount);
  if (!toAddress) return json({ error: "Claim has no recipient address" }, 409);
  if (!(Number(amount) > 0)) return json({ error: "Claim amount is not positive" }, 409);

  const currency: "NIM" | "USDT" = claim.currency;
  const network: "nimiq" | "evm" = currency === "NIM" ? "nimiq" : "evm";

  console.log(`[payout] referral_claim ${claimId} -> ${amount} ${currency} to ${toAddress}`);

  const signerRes = await fetch(`${SIGNER_URL}/sign-and-broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SIGNER_SHARED_SECRET}`,
    },
    body: JSON.stringify({ network, currency, to: toAddress, amount, reference: `ref:${claimId}` }),
  });
  if (!signerRes.ok) {
    const err = await signerRes.text();
    console.error("[payout] referral signer failed", err);
    return json({ error: "Signer failed", details: err }, 502);
  }

  const { txHash } = await signerRes.json();

  await supabase
    .from("referral_claims")
    .update({ status: "paid", tx_hash: txHash, paid_at: new Date().toISOString() })
    .eq("id", claimId);

  return json({ success: true, txHash });
}

/** Admin JWT (app_role=admin), the service role key (cron auto-settle), or the
 *  internal server-to-server secret. */
async function isAuthorized(req: Request): Promise<boolean> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  if (PAYOUT_INTERNAL_SECRET && token === PAYOUT_INTERNAL_SECRET) return true;
  if (CRON_SECRET && token === CRON_SECRET) return true;

  // Server-to-server: the pg_cron auto-settle sweep calls with the service role
  // key (same pattern as the watcher function).
  if (token === SUPABASE_SERVICE_ROLE_KEY) return true;

  if (JWT_SECRET_RAW) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET_RAW));
      return payload.app_role === "admin";
    } catch {
      return false;
    }
  }
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
