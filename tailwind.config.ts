import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        ams: {
          bg: "rgb(var(--ams-bg) / <alpha-value>)",
          panel: "rgb(var(--ams-panel) / <alpha-value>)",
          surface: "rgb(var(--ams-surface) / <alpha-value>)",
          field: "rgb(var(--ams-field) / <alpha-value>)",
          border: "rgb(var(--ams-border) / <alpha-value>)",
          cyan: "rgb(var(--ams-cyan) / <alpha-value>)",
          blue: "rgb(var(--ams-blue) / <alpha-value>)",
          ink: "rgb(var(--ams-ink) / <alpha-value>)",
          muted: "rgb(var(--ams-muted) / <alpha-value>)",
          heading: "rgb(var(--ams-heading) / <alpha-value>)",
          teal: "rgb(var(--ams-teal) / <alpha-value>)",
          amber: "rgb(var(--ams-amber) / <alpha-value>)",
        }
      },
      boxShadow: {
        glass: "var(--ams-shadow-glass)",
        glow: "var(--ams-shadow-glow)"
      }
    }
  },
  plugins: []
};

export default config;
