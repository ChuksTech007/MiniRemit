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
        celo: {
          green: "#35D07F",
          gold: "#FBCC5C",
          dark: "#1E2022",
          light: "#F7F8FA",
          card: "#121314",
          border: "#2C2F33",
        },
      },
    },
  },
  plugins: [],
};
export default config;
