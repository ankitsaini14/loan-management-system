import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe6",
        ink: "#1c1915",
        pine: "#1f6b4a",
        clay: "#8c3a2f",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "serif"],
      },
      boxShadow: {
        card: "0 16px 40px rgba(48, 36, 20, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
