import type { Currency } from "@/types/deal";

export interface SendPaymentParams {
  to: string;
  amount: string;
  currency: Currency;
  memo?: string;
}

export interface PaymentResult {
  txHash: string;
}

/**
 * Single point of contact with whichever wallet runtime hosts the app.
 *
 * MVP: MockWalletProvider — local, demoable, no network.
 * Next: NimiqWalletProvider — wraps the Nimiq Pay Mini App SDK.
 *
 * Any code that needs to send money should depend on this interface, never
 * a concrete provider.
 */
export interface WalletProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  getAddress(): Promise<string>;
  sendPayment(params: SendPaymentParams): Promise<PaymentResult>;
}
