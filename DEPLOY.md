# Deploying ProofHold to Vercel

This is the **first time** deployment guide. After this, Vercel auto-deploys on every push to `main`.

## 1. Sign in to Vercel

Go to **https://vercel.com** and click **Sign Up** (or **Log In** if you already have an account). Use the **"Continue with GitHub"** option — this gives Vercel permission to read your repos.

## 2. Import the repo

1. On the Vercel dashboard, click **Add New… → Project**
2. Under **Import Git Repository**, find `DropXpert/ProofHold` and click **Import**
   - If you don't see it: click **Adjust GitHub App Permissions** and grant access to the `DropXpert` org or to the `ProofHold` repo specifically

## 3. Configure the project

Vercel will auto-detect that this is a Vite project. Confirm the settings look like this — they should already be filled in:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Root Directory** | `./` |

Don't deploy yet — first add the env vars.

## 4. Add environment variables

Expand the **Environment Variables** section. You need to add these one at a time (paste the name in the **Key** field, the value in the **Value** field, then click **Add**):

| Key | Value (for testnet test deploy) |
|---|---|
| `VITE_NIMIQ_NETWORK` | `test` |
| `VITE_PROOFHOLD_CUSTODY_NIM_ADDR` | **Paste your Nimiq custody address from wallet.nimiq.com** |
| `VITE_USDT_CHAIN_ID` | `137` |
| `VITE_USDT_CONTRACT_ADDR` | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| `VITE_USDT_DECIMALS` | `6` |
| `VITE_PROOFHOLD_CUSTODY_EVM_ADDR` | **Paste your EVM custody address from MetaMask** |

**If you haven't created the custody addresses yet:** leave them as the placeholders (`NQ00 0000…` and `0x0000…`). The app will detect them and fall back to mock mode, so you can deploy and test the UI even without real wallets configured.

Leave **Environment** set to **Production, Preview, and Development** for all of these so they apply on every deploy.

## 5. Deploy

Click **Deploy**.

Wait ~60 seconds. You'll get a URL like:
```
https://proofhold-dropxpert.vercel.app
```

That URL is now live, HTTPS, and updates automatically every time you push to `main`.

## 6. Test inside Nimiq Pay

Open this deeplink on your phone (with Nimiq Pay installed):

```
nimiqpay://miniapp?url=https://YOUR-PROJECT.vercel.app
```

Or generate a QR code for the deeplink and scan it from inside Nimiq Pay.

You should see ProofHold open inside the Nimiq Pay wallet. If you set real custody addresses, payments will actually move NIM/USDT to your custody address.

---

## Later: custom domain

When you've bought `proofhold.app` (or whatever):

1. Vercel project → **Settings → Domains**
2. Type your domain → click **Add**
3. Vercel shows you the DNS records to add at your registrar — usually one `A` record and/or a `CNAME`
4. Save the DNS, wait a few minutes, Vercel auto-issues an SSL cert
5. Update env vars / mini-app submission to use the new URL

## Later: changing env vars

Project → **Settings → Environment Variables** → edit. Vercel will **not** auto-redeploy after env changes — you need to either push a commit or trigger a manual redeploy from the **Deployments** tab → **Redeploy**.

## Troubleshooting

- **404 on `/deal/PH-XXXX/pay`**: `vercel.json` should fix this with a catch-all rewrite to `index.html`. If you still see 404, check that `vercel.json` made it into the deploy (it's in this commit).
- **"Mock wallet" shown even on Nimiq Pay**: env vars aren't being read. Vercel needs them at build time — confirm they're set, then trigger a fresh deploy.
- **Bundle warning about >500KB chunks**: harmless for a wallet-hosted app, ignore.
