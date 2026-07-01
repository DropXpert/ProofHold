# XcrowHub Signer Service

Dedicated Node.js process that holds the **custody hot wallet seeds** and performs the actual on-chain release / refund / partial-refund transactions after a successful admin (or auto) decision.

This service is called **only** by the Supabase `payout` Edge Function over HTTPS using a shared secret. The seeds never leave this process.

## Why a separate service?

`@nimiq/core` (the WASM Albatross client) only runs in the browser and Node.js. It cannot run inside Supabase Edge Functions (Deno) or Cloudflare Workers. Hence the split described in the top-level `supabase/README.md`.

## Local development (for testing backend)

```powershell
cd signer
cp .env.example .env
# Edit .env and put your secrets (see below)

npm install
npm run dev   # now uses tsx (more stable on Node 22+)
```

The server listens on http://localhost:8787 by default.

The server listens on port 8787 by default.

### Test the signer locally (PowerShell example)

First run the signer with `npm run dev`.

Then test it:

```powershell
$secret = "your-SIGNER_SHARED_SECRET-from-.env"
$body = @{
    network = "evm"
    currency = "USDT"
    to = "0xYourTestRecipientAddress"
    amount = "0.01"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/sign-and-broadcast" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $secret" } `
    -ContentType "application/json" `
    -Body $body
```

## Production Deployment

**Important:** The signer is a separate long-running Node.js service. It is **not recommended** to run it on Vercel (your frontend is fine on Vercel).

Vercel serverless functions have short timeouts and are not designed for persistent services or holding sensitive secrets long-term.

### Recommended: Fly.io (easiest & cheapest for this use case)

Or good alternatives:
- Railway.app
- Render.com
- A cheap VPS (Hetzner, DigitalOcean, etc.)

Example with Fly.io:

1. `fly launch` (or `fly apps create`) in the `signer/` directory.
2. Set secrets:
   ```bash
   fly secrets set SIGNER_SHARED_SECRET=... \
     NIM_CUSTODY_SEED="word1 word2 ..." \
     EVM_CUSTODY_PRIVATE_KEY=0x... \
     NIM_RPC=... EVM_RPC=...
   ```
3. Deploy: `fly deploy`
4. Note the public URL (e.g. `https://xcrowhub-signer.fly.dev`).
5. Put that URL + the same `SIGNER_SHARED_SECRET` into your Supabase Edge Function secrets (or the `payout` function environment).
6. The `payout` Edge Function will call this URL on every successful release/refund.

## Security notes

- Use a completely separate, low-balance hot wallet for the custody addresses.
- Fund it only with the amounts you expect to hold in active deals + a small buffer.
- Never commit `.env` or any seed/private key.
- Rotate the shared secret periodically.
- Monitor the signer logs for unexpected payout requests.

## Relationship to the rest of the system

- Frontend (Vercel) still does the **buyer → custody** payment using the normal `WalletProvider` (Nimiq or EVM).
- After buyer confirms or admin decides, a Supabase procedure + the `payout` Edge Function asks **this** service to move money **from** the custody wallet to the final recipient (seller, buyer, or split).
- The `transactions` table in Supabase records both the incoming payment and the outgoing payout(s).

See the root `DEPLOY.md` and `supabase/README.md` for the full picture.