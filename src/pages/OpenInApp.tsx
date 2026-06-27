import { useEffect, useState } from "react";
import { nimiqPayDeeplink } from "@/lib/host";

/* Bounce target for Telegram notification buttons. Telegram inline buttons can't
   carry a nimiqpay:// scheme, so they link here (https) and we redirect into the
   mini app. Only same-app paths ("/...") are honoured — never an open redirect. */
export default function OpenInApp() {
  const [link, setLink] = useState("");

  useEffect(() => {
    const to = new URLSearchParams(window.location.search).get("to") ?? "";
    const path = to.startsWith("/") ? to : "";
    const deeplink = nimiqPayDeeplink(path);
    setLink(deeplink);
    window.location.replace(deeplink);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0E1512",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: 20,
      }}
    >
      <img src="/logo-icon.png" alt="XcrowHub" style={{ width: 64, height: 64, borderRadius: 16 }} />
      <div>
        <h1 style={{ color: "#EDE7DA", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
          Opening XcrowHub…
        </h1>
        <p style={{ color: "#928B7D", fontSize: 14, maxWidth: 320, lineHeight: 1.6, margin: "0 auto" }}>
          If the app didn't open automatically, tap below.
        </p>
      </div>
      {link && (
        <a
          href={link}
          style={{
            background: "#E8B964",
            color: "#0E1512",
            fontWeight: 700,
            fontSize: 14,
            padding: "11px 20px",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          Open in Nimiq Pay
        </a>
      )}
    </div>
  );
}
