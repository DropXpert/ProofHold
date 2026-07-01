// Detect whether the app is running inside the Nimiq Pay host (which injects
// window.nimiq / window.nimiqPay). Outside the host there's no wallet runtime,
// so the app shows an "Open in Nimiq Pay" gate.
//
// In dev (`npm run dev`) the gate is bypassed so local work isn't blocked.

export function isNimiqPayHost(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const w = window as unknown as { nimiq?: unknown; nimiqPay?: unknown };
  return Boolean(w.nimiq || w.nimiqPay);
}

// The canonical mini-app URL — always app.xcrowhub.com in production.
export const APP_URL = "https://app.xcrowhub.com";

// Read a pending referral code without importing the referral module (keeps this
// lightweight file dependency-free and avoids pulling Supabase into the landing
// bundle). Must match REF_STORAGE_KEY in lib/referral.ts.
function pendingRefCode(): string | null {
  try {
    return localStorage.getItem("xcrowhub.ref");
  } catch {
    return null;
  }
}

function withRef(url: string): string {
  const ref = pendingRefCode();
  if (!ref) return url;
  return url + (url.includes("?") ? "&" : "?") + "ref=" + encodeURIComponent(ref);
}

// Deep link that opens the mini app inside Nimiq Pay. Any pending referral code
// is forwarded on the inner app URL so attribution survives the www → app hop.
// An optional in-app path (e.g. "/deal/PH-1234/status") deep-links to that route.
export function nimiqPayDeeplink(path = ""): string {
  const root = import.meta.env.PROD
    ? APP_URL
    : typeof window !== "undefined"
    ? window.location.origin
    : APP_URL;
  const target = path ? root.replace(/\/$/, "") + path : root;
  return `nimiqpay://miniapp?url=${encodeURIComponent(withRef(target))}`;
}

// Bot handle for the Telegram notification link (t.me/<handle>).
export const TELEGRAM_BOT = "xcrowhub_bot";

// Official Nimiq Pay download links (verified).
export const NIMIQ_PAY_IOS = "https://apps.apple.com/us/app/nimiq-pay/id6471844738";
export const NIMIQ_PAY_ANDROID = "https://play.google.com/store/apps/details?id=com.nimiq.pay";
export const NIMIQ_PAY_SITE = "https://www.nimiq.com/nimiq-pay/";
