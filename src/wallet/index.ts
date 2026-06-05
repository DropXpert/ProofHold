import { MockWalletProvider } from "./MockWalletProvider";
import { NimiqWalletProvider } from "./NimiqWalletProvider";
import type { WalletProvider } from "./WalletProvider";

let cached: WalletProvider | null = null;

export async function getWallet(): Promise<WalletProvider> {
  if (cached) return cached;

  const nimiq = new NimiqWalletProvider();
  if (await nimiq.isAvailable()) {
    cached = nimiq;
    return cached;
  }

  cached = new MockWalletProvider();
  return cached;
}

export type { WalletProvider } from "./WalletProvider";
