import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        // The AMS house faces, used by the public pages so Access reads as
        // part of amshq.in rather than a different company's product.
        display: ["var(--font-source-serif)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "rgb(var(--firms-bg) / <alpha-value>)",
        "surface-2": "rgb(var(--firms-surface-2) / <alpha-value>)",
        border: "rgb(var(--firms-border) / <alpha-value>)",
        text: "rgb(var(--firms-text) / <alpha-value>)",
        "text-strong": "rgb(var(--firms-text-strong) / <alpha-value>)",
        gold: "rgb(var(--firms-accent) / <alpha-value>)",
        "gold-soft": "rgb(var(--firms-accent-soft) / <alpha-value>)",
        // Preserve Tailwind's numbered scales used by the rest of the app;
        // the Firms portal additionally uses the semantic DEFAULT shade.
        blue: { ...colors.blue, DEFAULT: "rgb(var(--firms-operator) / <alpha-value>)" },
        green: { ...colors.green, DEFAULT: "rgb(var(--firms-positive) / <alpha-value>)" },
        red: { ...colors.red, DEFAULT: "rgb(var(--firms-negative) / <alpha-value>)" },
        burgundy: {
          DEFAULT: "#571c24",
          deep: "#3b141a",
        },
        cream: {
          DEFAULT: "#f5f0e4",
          light: "#fffcf5",
        },
        // Derived from the Access mark: a violet gradient running deep
        // indigo to orchid. Kept pastel and slightly warm so it reads
        // vintage rather than SaaS, which is what the old purple-on-white
        // looked like. Every value is a CSS variable so one `.dark` class
        // flips the whole site; the hexes live in globals.css.
        paper: "rgb(var(--ac-paper) / <alpha-value>)",
        surface: "rgb(var(--ac-surface) / <alpha-value>)",
        ink: "rgb(var(--ac-ink) / <alpha-value>)",
        muted: "rgb(var(--ac-muted) / <alpha-value>)",
        line: "rgb(var(--ac-line) / <alpha-value>)",
        violet: {
          DEFAULT: "rgb(var(--ac-violet) / <alpha-value>)",
          deep: "rgb(var(--ac-violet-deep) / <alpha-value>)",
          soft: "rgb(var(--ac-violet-soft) / <alpha-value>)",
        },
        orchid: "rgb(var(--ac-orchid) / <alpha-value>)",
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
      borderRadius: {
        // Institutional geometry: controls stay usable, surfaces stay
        // precise. Nothing on the public pages is rounder than this.
        control: "0.25rem",
        panel: "0.125rem",
      },
      transitionTimingFunction: {
        // One easing for every reveal on the public pages. Several would
        // read as several hands.
        reveal: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      boxShadow: {
        glass: "var(--ams-shadow-glass)",
        glow: "var(--ams-shadow-glow)"
      },
      animation: {
        "reveal-in": "reveal-in 220ms ease-out both",
        grid: "grid 15s linear infinite",
        "spin-around": "spin-around calc(var(--speed, 2s) * 2) infinite linear",
        slide: "slide var(--speed, 2s) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "meteor-effect": "meteor 5s linear infinite",
        aurora: "aurora 60s linear infinite",
      },
      keyframes: {
        "reveal-in": {
          "0%": { opacity: "0", transform: "translateY(4px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
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
