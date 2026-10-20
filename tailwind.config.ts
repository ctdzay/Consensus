import type { Config } from "tailwindcss";

const config: Config = {
  content: ["src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070605",
          900: "#0c0a08",
          800: "#161310",
          700: "#221c16",
        },
        gold: {
          200: "#f3e6c4",
          300: "#e8d5a3",
          400: "#d4b56a",
          500: "#c6a15b",
          700: "#8a6a2f",
        },
        felt: {
          700: "#14533c",
          800: "#0f3d2e",
          900: "#0a2a20",
        },
        burgundy: {
          500: "#8b2433",
          700: "#6b1d2a",
        },
        cream: "#f4ead7",
        stone: "#9a8f7c",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(198, 161, 91, 0.35), 0 18px 40px rgba(0, 0, 0, 0.45)",
        table: "inset 0 0 80px rgba(0, 0, 0, 0.35), 0 24px 60px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
      },
    },
  },
  plugins: [],
};

export default config;
