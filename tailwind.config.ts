import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#1e3a5f",
          foreground: "#ffffff",
        },
        orange: {
          DEFAULT: "#f97316",
          foreground: "#ffffff",
        },
      },
      zIndex: {
        dropdown: "100",
        datepicker: "110",
        modal: "200",
        toast: "300",
      },
    },
  },
  plugins: [],
};
export default config;
