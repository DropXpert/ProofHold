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
      },
      boxShadow: {
        receipt:
          "0 1px 0 rgba(23, 20, 17, 0.04), 0 1px 2px rgba(23, 20, 17, 0.06)",
        lift: "0 8px 24px -8px rgba(23, 20, 17, 0.18)",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [],
};
