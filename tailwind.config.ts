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
          /* semantic globals */
          dark:   "rgb(var(--ams-dark)   / <alpha-value>)",
          accent: "rgb(var(--ams-accent) / <alpha-value>)",
          /* existing tokens */
          bg:      "rgb(var(--ams-bg)      / <alpha-value>)",
          panel:   "rgb(var(--ams-panel)   / <alpha-value>)",
          surface: "rgb(var(--ams-surface) / <alpha-value>)",
          field:   "rgb(var(--ams-field)   / <alpha-value>)",
          border:  "rgb(var(--ams-border)  / <alpha-value>)",
          cyan:    "rgb(var(--ams-cyan)    / <alpha-value>)",
          blue:    "rgb(var(--ams-blue)    / <alpha-value>)",
          ink:     "rgb(var(--ams-ink)     / <alpha-value>)",
          muted:   "rgb(var(--ams-muted)   / <alpha-value>)",
          heading: "rgb(var(--ams-heading) / <alpha-value>)",
          teal:    "rgb(var(--ams-teal)    / <alpha-value>)",
          amber:   "rgb(var(--ams-amber)   / <alpha-value>)",
        }
      },
      boxShadow: {
        glass: "var(--ams-shadow-glass)",
        glow: "var(--ams-shadow-glow)"
      },
      animation: {
        grid: "grid 15s linear infinite",
        "spin-around": "spin-around calc(var(--speed, 2s) * 2) infinite linear",
        slide: "slide var(--speed, 2s) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "meteor-effect": "meteor 5s linear infinite",
        aurora: "aurora 60s linear infinite",
      },
      keyframes: {
        grid: {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0)" },
        },
        "spin-around": {
          "0%": {
            transform: "translateZ(0) rotate(0)",
          },
          "15%, 35%": {
            transform: "translateZ(0) rotate(90deg)",
          },
          "65%, 85%": {
            transform: "translateZ(0) rotate(270deg)",
          },
          "100%": {
            transform: "translateZ(0) rotate(360deg)",
          },
        },
        slide: {
          to: {
            transform: "translate(calc(100cqw - 100%), 0)",
          },
        },
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
      },
    }
  },
  plugins: []
};

export default config;
