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
    console.debug("[ProofHold] nimiq.listAccounts:", result);
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

    const recipient = normalizeNimAddress(config.nimiq.custodyAddress);
    const value = nimToLunas(params.amount);

    console.debug("[ProofHold] sendBasicTransaction request:", {
      recipientRaw: config.nimiq.custodyAddress,
      recipientNormalized: recipient,
      value,
      amountNim: params.amount,
    });

    let result;
    try {
      result = await nimiq.sendBasicTransaction({
        recipient,
        value,
      });
    } catch (err) {
      console.error("[ProofHold] sendBasicTransaction threw:", err);
      throw err;
    }

    console.debug("[ProofHold] sendBasicTransaction result:", result);

    if (isErrorResponse(result)) {
      throw new Error(`Nimiq sendBasicTransaction: ${result.error.message}`);
    }

    if (typeof result !== "string" || result.length === 0) {
      throw new Error(
        `Nimiq sendBasicTransaction returned unexpected value: ${JSON.stringify(result)}`
      );
    }

    return { txHash: result };
  }
}

function normalizeNimAddress(addr: string): string {
  // Nimiq's user-friendly format: NQ-prefix + 9 groups of 4 alphanumerics
  // separated by single spaces. Normalize whitespace and uppercase so paste
  // mistakes (extra spaces, lowercase, line breaks) don't trip validation.
  const cleaned = addr.replace(/\s+/g, " ").trim().toUpperCase();

  // Pull out only the meaningful characters then re-group every 4.
  const compact = cleaned.replace(/\s/g, "");
  if (!/^NQ\d{2}[A-Z0-9]{32}$/.test(compact)) {
    throw new Error(
      `Custody address "${addr}" is not a valid Nimiq address. Expected NQXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX (NQ + 34 chars).`
    );
  }
  const grouped = compact.match(/.{1,4}/g)!.join(" ");
  return grouped;
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
