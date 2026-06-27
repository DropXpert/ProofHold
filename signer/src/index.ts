/**
 * XcrowHub Custody Signer Service
 *
 * Small dedicated Node process that holds the hot wallet seeds.
 * Called only by the Supabase payout Edge Function (via shared secret).
 *
 * Endpoints:
 *   POST /sign-and-broadcast
 *     Headers: Authorization: Bearer <SIGNER_SHARED_SECRET>
 *     Body: { network: "nimiq" | "evm", currency: "NIM" | "USDT", to: string, amount: string, memo?: string, reference?: string }
 *     Response: { txHash: string } or error
 *
 * GET /health → { ok: true }
 *
 * The actual release of funds (after buyer confirms or admin decides) happens here,
 * never in the browser and never in Deno Edge Functions (because @nimiq/core WASM
 * only runs in browser + Node).
 */

import "dotenv/config";
import express from "express";
import { JsonRpcProvider, Contract, parseUnits, Wallet } from "ethers";
import { MnemonicUtils, KeyPair, TransactionBuilder, Address } from "@nimiq/core";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8787;
const SHARED_SECRET = process.env.SIGNER_SHARED_SECRET || "";
const NIM_SEED = process.env.NIM_CUSTODY_SEED || "";
const EVM_PRIV = process.env.EVM_CUSTODY_PRIVATE_KEY || "";
const NIM_RPC = process.env.NIM_RPC || "https://rpc.nimiqwatch.com";
const EVM_RPC = process.env.EVM_RPC || "https://polygon-rpc.com";

if (!SHARED_SECRET || SHARED_SECRET === "change-me-to-a-long-random-value") {
  console.warn("WARNING: SIGNER_SHARED_SECRET is not set to a strong value!");
}

app.post("/sign-and-broadcast", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== SHARED_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { network, currency, to, amount, memo, reference } = req.body || {};

    if (!network || !currency || !to || !amount) {
      return res.status(400).json({ error: "Missing required fields: network, currency, to, amount" });
    }

    console.log(`[signer] payout network=${network} currency=${currency} to=${to} amount=${amount} ref=${reference || ""}`);

    let txHash: string;

    if (network === "nimiq" || currency === "NIM") {
      txHash = await signAndBroadcastNIM(to, amount);
    } else if (network === "evm" || currency === "USDT") {
      txHash = await signAndBroadcastEVM(to, amount);
    } else {
      return res.status(400).json({ error: `Unsupported network/currency: ${network}/${currency}` });
    }

    res.json({ txHash, status: "broadcast" });
  } catch (err: any) {
    console.error("[signer] error", err);
    res.status(500).json({ error: err.message || "Internal signer error" });
  }
});

async function signAndBroadcastNIM(to: string, amount: string): Promise<string> {
  if (!NIM_SEED) throw new Error("NIM_CUSTODY_SEED not configured in signer");

  // Derive KeyPair from BIP39 mnemonic using Nimiq BIP44 path m/44'/242'/0'/0'
  const words = NIM_SEED.trim().split(/\s+/);
  const extKey = MnemonicUtils.mnemonicToExtendedPrivateKey(words, "");
  const keyPair = KeyPair.derive(extKey.derivePath("m/44'/242'/0'/0'").privateKey);
  const fromAddress = keyPair.publicKey.toAddress().toUserFriendlyAddress();

  const valueLunas = BigInt(Math.round(parseFloat(amount) * 100_000));

  console.log("[signer/NIM] Preparing payout:");
  console.log("  From (custody):", fromAddress);
  console.log("  To:", to);
  console.log("  Amount:", amount, "NIM (", valueLunas.toString(), "lunas)");

  // Fetch latest block height for validity window
  let validityStartHeight = 0;
  try {
    const heightRes = await fetch("https://api.nimiq.watch/v1/blocks/latest");
    if (heightRes.ok) {
      const data = (await heightRes.json()) as any;
      validityStartHeight = data?.number || 0;
    }
  } catch {
    console.warn("[signer/NIM] Could not fetch block height, using 0");
  }

  const sender = keyPair.publicKey.toAddress();
  const recipient = Address.fromAny(to);

  // Build and sign a basic transaction (network_id 24 = Albatross mainnet)
  const tx = TransactionBuilder.newBasic(
    sender,
    recipient,
    valueLunas,
    undefined,           // fee — let network use minimum (0)
    validityStartHeight,
    24                   // Albatross mainnet network ID
  );
  tx.sign(keyPair);
  const txHex = tx.toHex();

  console.log("[signer/NIM] Transaction signed, txHex prefix:", txHex.slice(0, 40) + "...");

  // Broadcast via JSON-RPC
  try {
    const rpcRes = await fetch(NIM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendRawTransaction",
        params: [txHex],
      }),
    });
    const result = (await rpcRes.json()) as any;
    if (result?.error) {
      throw new Error(`RPC error: ${JSON.stringify(result.error)}`);
    }
    // nimiqwatch wraps: { result: { data: "hash", metadata: null } }
    // standard JSON-RPC: { result: "hash" }
    const rpcResult = result?.result;
    const hash: string =
      typeof rpcResult === "string" ? rpcResult :
      typeof rpcResult?.data === "string" ? rpcResult.data : "";
    if (hash) {
      console.log("[signer/NIM] Broadcast OK, hash:", hash);
      return hash;
    }
  } catch (e: any) {
    console.warn("[signer/NIM] RPC broadcast failed:", e.message);
    throw e;
  }

  throw new Error("Broadcast returned no result and no error");
}

async function signAndBroadcastEVM(to: string, amount: string): Promise<string> {
  if (!EVM_PRIV) throw new Error("EVM_CUSTODY_PRIVATE_KEY not configured in signer");

  const provider = new JsonRpcProvider(EVM_RPC);
  const wallet = new Wallet(EVM_PRIV, provider);

  const USDT_CONTRACT = process.env.USDT_CONTRACT || "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
  const DECIMALS = Number(process.env.USDT_DECIMALS || "6");

  const token = new Contract(
    USDT_CONTRACT,
    ["function transfer(address to, uint256 value) returns (bool)"],
    wallet
  );

  const value = parseUnits(amount, DECIMALS);
  const tx = await token.transfer(to, value);
  console.log("[signer/EVM] broadcast tx", tx.hash);
  return tx.hash;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`XcrowHub signer listening on http://localhost:${PORT}`);
  console.log("Ready to sign payouts from the custody hot wallets (NIM + EVM).");
});
