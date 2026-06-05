export interface Env {
  DB: D1Database;
  KV: KVNamespace;

  NIMIQ_NETWORK: string;
  NIMIQ_RPC_URL: string;
  PROOFHOLD_CUSTODY_NIM_ADDR: string;
  PROOFHOLD_ADMIN_NIM_ADDR: string;

  EVM_CHAIN_ID: string;
  EVM_RPC_URL: string;
  USDT_CONTRACT_ADDR: string;
  USDT_DECIMALS: string;
  PROOFHOLD_CUSTODY_EVM_ADDR: string;

  CORS_ORIGINS: string;

  // Secrets
  PROOFHOLD_NIM_SEED: string;
  PROOFHOLD_EVM_PRIVATE_KEY: string;
  AUTH_JWT_SECRET: string;
}
