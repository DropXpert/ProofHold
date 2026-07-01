/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F8F3EA",
        surface: "#FFFDF8",
        ink: "#171411",
        muted: "#71695F",
        edge: "#E4D8C7",
        accent: {
          DEFAULT: "#2F6F5E",
          soft: "#DDEBE5",
          ink: "#1F4A3F",
        },
        warning: "#B7791F",
        danger: "#B94A48",
        success: "#2F6F5E",
        // Premium landing palette — deep ink canvas + warm gold + jade.
        night: {
          DEFAULT: "#0E1512",
          soft: "#13201B",
          line: "#243A31",
        },
        gold: {
          DEFAULT: "#E8B964",
          soft: "#F5D89B",
        },
        jade: {
          DEFAULT: "#4FD1A5",
          deep: "#2F6F5E",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        card: "14px",
        pill: "999px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        receipt:
          "0 1px 0 rgba(23, 20, 17, 0.04), 0 1px 2px rgba(23, 20, 17, 0.06)",
        lift: "0 8px 24px -8px rgba(23, 20, 17, 0.18)",
        glow: "0 0 0 1px rgba(232, 185, 100, 0.18), 0 24px 60px -20px rgba(232, 185, 100, 0.35)",
        float: "0 30px 80px -30px rgba(0, 0, 0, 0.6)",
      },
      maxWidth: {
        app: "480px",
        site: "1200px",
      },
      keyframes: {
        "float-y": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.7" },
          "33%": { transform: "translate(6%, -8%) scale(1.15)", opacity: "0.9" },
          "66%": { transform: "translate(-6%, 6%) scale(0.95)", opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "float-y": "float-y 6s ease-in-out infinite",
        aurora: "aurora 18s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "reveal-up": "reveal-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        marquee: "marquee 28s linear infinite",
        "spin-slow": "spin-slow 22s linear infinite",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
