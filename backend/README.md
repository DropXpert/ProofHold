# ProofHold backend

Cloudflare Workers + D1 backend for ProofHold. Handles:

- Deal CRUD with strict state machine (mirrors `src/lib/stateMachine.ts` in the frontend)
- Wallet-signature auth (Nimiq `sign()` for NIM, EIP-191 `personal_sign` for EVM)
- Custody payouts (signs and broadcasts release/refund txs from the hot wallet)
- On-chain watcher (cron-triggered, polls Nimiq and EVM RPC for incoming buyer txs)

The frontend in `../` is unchanged in shape — `src/store/dealStore.ts` will be rewired to call this API instead of writing to localStorage.

## One-time setup

```bash
# 1. Install deps
npm install

# 2. Create the D1 database
npx wrangler d1 create proofhold
# → copy the database_id into wrangler.toml under [[d1_databases]]

# 3. Create the KV namespace
npx wrangler kv namespace create KV
# → copy the id into wrangler.toml under [[kv_namespaces]]

# 4. Apply migrations
npm run db:migrate:local    # for local wrangler dev
npm run db:migrate:remote   # against the live Cloudflare DB

# 5. Set secrets (each prompts for the value, never stored in the repo)
npx wrangler secret put PROOFHOLD_NIM_SEED          # paste the 24 words from wallet.nimiq.com
npx wrangler secret put PROOFHOLD_EVM_PRIVATE_KEY   # 0x-prefixed hex from MetaMask
npx wrangler secret put AUTH_JWT_SECRET             # any 32-byte hex; openssl rand -hex 32

# 6. Update the REPLACE_ME values in wrangler.toml for:
#    PROOFHOLD_CUSTODY_NIM_ADDR
#    PROOFHOLD_ADMIN_NIM_ADDR
#    PROOFHOLD_CUSTODY_EVM_ADDR

# 7. Deploy
npm run deploy
```

## Local dev

```bash
npm run dev
# → http://localhost:8787/health
```

## Endpoints

(Initial skeleton — these get filled in across Phases 2–6.)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | — | liveness |
| `GET` | `/config` | — | public config (custody addrs, network, chain id) |
| `GET` | `/api/deals/:id` | — | fetch deal by ID |
| `GET` | `/api/deals` | seller-sig | list deals owned by signed addr |
| `POST` | `/api/deals` | seller-sig | create deal |
| `POST` | `/api/deals/:id/pay` | buyer-sig | record buyer tx hash |
| `POST` | `/api/deals/:id/deliver` | seller-sig | mark delivered |
| `POST` | `/api/deals/:id/confirm` | buyer-sig | confirm receipt → triggers release |
| `POST` | `/api/deals/:id/query` | buyer or seller | open query |
| `POST` | `/api/deals/:id/proof` | buyer or seller | submit proof |
| `GET` | `/api/admin/deals` | admin-sig | list deals needing admin |
| `POST` | `/api/admin/deals/:id/decide` | admin-sig | apply decision → triggers payout |

## Custody flow

```
Buyer pays  ──→  custody address (PROOFHOLD_CUSTODY_NIM_ADDR / _EVM_ADDR)
                          │
                          │ watcher cron detects + records
                          ▼
              status: awaiting_payment → funds_held
                          │
                          ▼
              [seller delivers, buyer confirms]
                          │
                          ▼
        backend signs payout tx from hot wallet to seller
                          │
                          ▼
              status: released, release_tx_hash recorded
```

If the deal goes through dispute → admin review → admin decides, the backend signs the same payout tx but to the recipient(s) chosen in the decision.

## Security notes

- The hot wallet seed lives **only** in Cloudflare Workers secrets — never in the repo, never logged, never returned in API responses.
- Auth uses fresh wallet signatures with nonces (stored in KV with TTL) to prevent replay.
- State transitions are enforced server-side. The frontend's `allowedTransitions` map is duplicated here intentionally — clients are not trusted.
- D1 has automatic backups on Cloudflare's side. Custody is still the only honeypot; multi-sig is a Phase 9 upgrade.
