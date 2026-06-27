import { MockWalletProvider } from "./MockWalletProvider";
import { NimiqWalletProvider } from "./NimiqWalletProvider";
import type { EvmWalletProvider } from "./EvmWalletProvider";
import type { WalletProvider } from "./WalletProvider";
import type { Currency } from "@/types/deal";
import { isCustodyConfigured } from "@/lib/config";

const mock = new MockWalletProvider();
const nimiq = new NimiqWalletProvider();

// ethers.js (268KB) is only needed for USDT/EVM — load it on demand so NIM-only
// sessions (and the gate/landing pages) never pay for it.
let evmInstance: EvmWalletProvider | null = null;
async function getEvmProvider(): Promise<EvmWalletProvider> {
  if (!evmInstance) {
    const { EvmWalletProvider } = await import("./EvmWalletProvider");
    evmInstance = new EvmWalletProvider();
  }
  return evmInstance;
}

/**
 * Pick the right wallet provider for a given currency.
 *
 * NIM → NimiqWalletProvider (uses @nimiq/mini-app-sdk, only works inside
 *   Nimiq Pay).
 * USDT → EvmWalletProvider (uses window.ethereum, works inside Nimiq Pay's
 *   EVM bridge or any normal Web3 wallet).
 *
 * Falls back to MockWalletProvider when:
 *   - The real provider isn't available (not running in a wallet host), OR
 *   - The custody address for that currency isn't configured yet
 *     (avoids sending real funds to a placeholder 0x0 / NQ00 address).
 */
export async function getWallet(
  currency: Currency
): Promise<WalletProvider> {
  if (!isCustodyConfigured(currency)) {
    return mock;
  }

  const real = currency === "NIM" ? nimiq : await getEvmProvider();
  if (await real.isAvailable()) {
    return real;
  }
  return mock;
}

export type { WalletProvider } from "./WalletProvider";
