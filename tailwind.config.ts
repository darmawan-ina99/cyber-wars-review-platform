import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#05050A",
          raised: "#0A0A12",
          edge: "#15151F",
        },
        neon: {
          cyan: "#00F0FF",
          crimson: "#FF003C",
          matrix: "#00FF66",
          amber: "#FFB800",
        },
        slatehud: "#8892B0",
      },
      fontFamily: {
        hud: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 6px rgba(0,240,255,0.55), inset 0 0 12px rgba(0,240,255,0.08)",
        "neon-crimson": "0 0 6px rgba(255,0,60,0.6), inset 0 0 12px rgba(255,0,60,0.1)",
        "neon-matrix": "0 0 6px rgba(0,255,102,0.55), inset 0 0 12px rgba(0,255,102,0.08)",
      },
      keyframes: {
        radar: {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 6px currentColor" },
          "50%": { opacity: "0.35", boxShadow: "0 0 2px currentColor" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.6" },
          "94%": { opacity: "1" },
        },
      },
      animation: {
        radar: "radar 1.6s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        flicker: "flicker 7s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
