import { init } from "@nimiq/mini-app-sdk";
import type {
  PaymentResult,
  SendPaymentParams,
  WalletProvider,
} from "./WalletProvider";
import { config } from "@/lib/config";

/**
 * Real wallet provider for Nimiq Pay. Uses @nimiq/mini-app-sdk to talk to
 * the host. Falls back to "not available" outside the host so the factory
 * in ./index.ts can pick the mock provider for local dev.
 *
 * The recipient on the basic transaction is the ProofHold custody address
 * (from VITE_PROOFHOLD_CUSTODY_NIM_ADDR), not the seller — that's what
 * makes "funds held" real. The seller is paid out by the backend later
 * when the deal releases (Milestone B).
 */
export class NimiqWalletProvider implements WalletProvider {
  readonly name = "Nimiq Pay";

  async isAvailable() {
    if (typeof window === "undefined") return false;
    const w = window as unknown as { nimiq?: unknown; nimiqPay?: unknown };
    return Boolean(w.nimiq || w.nimiqPay);
  }

  async getAddress(): Promise<string> {
    const nimiq = await init({ timeout: 5_000 });
    const result = await nimiq.listAccounts();
    if (isErrorResponse(result)) {
      throw new Error(`Nimiq listAccounts: ${result.error.message}`);
    }
    if (result.length === 0) {
      throw new Error("No Nimiq accounts available in the host wallet.");
    }
    return result[0];
  }

  async sendPayment(params: SendPaymentParams): Promise<PaymentResult> {
    if (params.currency !== "NIM") {
      throw new Error(
        `NimiqWalletProvider only handles NIM; got ${params.currency}.`
      );
    }

    const nimiq = await init({ timeout: 5_000 });

    // The deal store passes the seller address as `to`. For real custody,
    // override with the ProofHold custody address — the seller is paid out
    // later when the deal releases.
    const recipient = config.nimiq.custodyAddress;

    // Nimiq amounts are in Lunas (1 NIM = 1e5 Lunas).
    const value = nimToLunas(params.amount);

    const result = await nimiq.sendBasicTransaction({
      recipient,
      value,
    });

    if (isErrorResponse(result)) {
      throw new Error(`Nimiq sendBasicTransaction: ${result.error.message}`);
    }

    // `result` here is the serialized transaction string. We treat it as
    // the tx hash for receipt purposes; the backend (Milestone B) will
    // match it against the on-chain tx for confirmation.
    return { txHash: result };
  }
}

function nimToLunas(amount: string): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid NIM amount: ${amount}`);
  }
  return Math.round(n * 1e5);
}

function isErrorResponse(
  value: unknown
): value is { error: { message: string } } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "object"
  );
}
