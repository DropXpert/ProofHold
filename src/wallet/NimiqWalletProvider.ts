import type {
  PaymentResult,
  SendPaymentParams,
  WalletProvider,
} from "./WalletProvider";

/**
 * Placeholder for the real Nimiq Pay Mini App integration.
 *
 * When Nimiq's Mini App SDK is available on `window`, swap this in via
 * `getWallet()` in ./index.ts. Until then, the app uses MockWalletProvider.
 *
 * Implementation outline (per spec):
 *   - detect host via a property like `window.nimiq` / `window.NimiqPay`
 *   - request the current wallet address from the host
 *   - call host.sendPayment / host.requestTransaction
 *   - return the resulting tx hash
 */
export class NimiqWalletProvider implements WalletProvider {
  readonly name = "Nimiq Pay";

  async isAvailable() {
    if (typeof window === "undefined") return false;
    const w = window as unknown as { nimiq?: unknown; NimiqPay?: unknown };
    return Boolean(w.nimiq || w.NimiqPay);
  }

  async getAddress(): Promise<string> {
    throw new Error("NimiqWalletProvider.getAddress not yet implemented");
  }

  async sendPayment(_params: SendPaymentParams): Promise<PaymentResult> {
    throw new Error("NimiqWalletProvider.sendPayment not yet implemented");
  }
}
