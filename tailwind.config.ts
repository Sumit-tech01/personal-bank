import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F7F3",
        card: "#FFFFFF",
        ink: {
          DEFAULT: "#17251B",
          secondary: "#5F6E63",
          muted: "#8C998F",
        },
        line: {
          DEFAULT: "#E4EAE4",
          strong: "#D4DDD4",
        },
        brand: {
          50: "#EFF7F1",
          100: "#DCEFE2",
          200: "#BEE2C9",
          300: "#93CDA7",
          400: "#62AE7F",
          500: "#3A8B5B",
          600: "#2F7D4F",
          700: "#24633E",
          800: "#1D5032",
          900: "#173F28",
        },
        positive: {
          DEFAULT: "#1F8A57",
          light: "#E7F6ED",
        },
        negative: {
          DEFAULT: "#C25550",
          light: "#FBECEB",
        },
        amber: {
          DEFAULT: "#B7791F",
          light: "#FCF3E3",
        },
        sky: {
          DEFAULT: "#2B6CB0",
          light: "#EAF2FB",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "22px",
        btn: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,37,27,0.04), 0 12px 32px -24px rgba(23,37,27,0.28)",
        float: "0 14px 32px -10px rgba(47,125,79,0.55)",
        nav: "0 -8px 30px -22px rgba(23,37,27,0.4)",
        sheet: "0 -18px 60px -20px rgba(23,37,27,0.35)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "sheet-in": {
          from: { transform: "translateY(24px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "toast-in": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pop-in": {
          from: { transform: "scale(0.97)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out both",
        "sheet-in": "sheet-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "toast-in": "toast-in 200ms ease-out both",
        "pop-in": "pop-in 160ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
