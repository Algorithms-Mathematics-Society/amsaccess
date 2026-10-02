import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * Org portal theme: light only. Values mirror the LIGHT side of the desktop
 * app's accessTheme.ts so both products read as one system.
 *
 * Source of truth. Compile with `pnpm theme:build` (astryx theme build), which
 * writes org.js, org.d.ts and orgTheme.css next to this file. Never edit the
 * generated files by hand.
 *
 * Purple (#7c3aed) is reserved for keyboard focus and tiny brand details,
 * never for fills. Primary buttons are inverted: black fill, white text.
 */
export const orgTheme = defineTheme({
  name: "org",
  extends: neutralTheme,
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: { family: "Geist Sans", fallbacks: "Arial, sans-serif" },
    heading: {
      family: "Geist Sans",
      fallbacks: "Arial, sans-serif",
      weight: "semibold",
    },
    code: { family: "Geist Mono", fallbacks: "monospace" },
  },
  radius: { base: 3, multiplier: 1 },
  motion: { fast: 120, medium: 200, slow: 320, ratio: 0.75 },
  tokens: {
    "--color-background-body": "#fafafa",
    "--color-background-card": "#ffffff",
    "--color-background-surface": "#f5f5f5",
    "--color-background-popover": "#ffffff",
    "--color-background-muted": "#eeeeee",
    "--color-background-inverted": "#171717",
    "--color-text-primary": "#171717",
    "--color-text-secondary": "#5b5b5b",
    "--color-text-disabled": "#777777",
    "--color-icon-primary": "#171717",
    "--color-icon-secondary": "#5b5b5b",
    "--color-icon-disabled": "#777777",
    "--color-border": "#dedede",
    "--color-border-emphasized": "#858585",
    "--color-overlay": "#00000066",
    "--color-overlay-hover": "#0000000a",
    "--color-overlay-pressed": "#00000014",
    "--color-neutral": "#ededed",
    "--color-track": "#b8b8b8",
    "--color-skeleton": "#dedede",
    "--color-shadow": "#00000012",
    // Purple: focus rings and compact brand markers only.
    "--color-accent": "#7c3aed",
    "--color-text-accent": "#6d28d9",
    "--color-icon-accent": "#6d28d9",
    "--color-on-accent": "#ffffff",
    "--color-accent-muted": "#7c3aed14",
    "--color-background-purple": "#7c3aed14",
    "--color-border-purple": "#7c3aed",
    "--color-text-purple": "#6d28d9",
    "--color-icon-purple": "#6d28d9",
    "--color-success": "#15803d",
    "--color-text-green": "#166534",
    "--color-success-muted": "#15803d14",
    "--color-border-green": "#15803d80",
    "--color-warning": "#a16207",
    "--color-text-yellow": "#854d0e",
    "--color-warning-muted": "#a1620714",
    "--color-border-yellow": "#a1620780",
    "--color-error": "#b91c1c",
    "--color-text-red": "#b91c1c",
    "--color-error-muted": "#b91c1c14",
    "--color-border-red": "#b91c1c80",
    "--shadow-low": "0 1px 3px #0000000d",
    "--shadow-med": "0 4px 16px #00000012",
    "--shadow-high": "0 16px 48px #00000024",
    "--shadow-inset-hover": "inset 0 0 0 2px var(--color-border-emphasized)",
    "--shadow-inset-selected": "inset 0 0 0 2px var(--color-accent)",
    "--shadow-inset-success": "inset 0 0 0 2px var(--color-border-green)",
    "--shadow-inset-warning": "inset 0 0 0 2px var(--color-border-yellow)",
    "--shadow-inset-error": "inset 0 0 0 2px var(--color-border-red)",
    "--font-size-xs": "0.75rem",
    "--font-size-sm": "0.75rem",
  },
  components: {
    // Calm cards: the hairline border, not the emphasized one Astryx defaults to.
    card: {
      base: { borderColor: "var(--color-border)" },
    },
    // A picked calendar day is black like a primary button, never a purple fill.
    "calendar-day": {
      selected: {
        backgroundColor: "var(--color-background-inverted)",
        color: "var(--color-background-card)",
      },
    },
    button: {
      "variant:primary": {
        backgroundColor: "var(--color-background-inverted)",
        color: "var(--color-background-card)",
        ":hover": {
          backgroundColor:
            "color-mix(in srgb, var(--color-background-inverted), var(--color-background-body) 12%)",
        },
        ":active": {
          backgroundColor:
            "color-mix(in srgb, var(--color-background-inverted), var(--color-background-body) 20%)",
        },
      },
      "variant:destructive": {
        backgroundColor: "var(--color-error-muted)",
        color: "var(--color-text-red)",
      },
    },
    badge: {
      "variant:info": {
        backgroundColor: "var(--color-background-muted)",
        color: "var(--color-text-primary)",
      },
      "variant:success": {
        backgroundColor: "var(--color-success-muted)",
        color: "var(--color-text-green)",
      },
      "variant:warning": {
        backgroundColor: "var(--color-warning-muted)",
        color: "var(--color-text-yellow)",
      },
      "variant:error": {
        backgroundColor: "var(--color-error-muted)",
        color: "var(--color-text-red)",
      },
    },
    statusdot: {
      "variant:accent": { backgroundColor: "var(--color-accent)" },
      "variant:success": { backgroundColor: "var(--color-success)" },
      "variant:warning": { backgroundColor: "var(--color-warning)" },
      "variant:error": { backgroundColor: "var(--color-error)" },
    },
    progressbar: {
      // General progress stays neutral, never purple.
      "variant:accent": { "--color-accent": "var(--color-text-primary)" },
      "variant:success": { "--color-success": "var(--color-text-green)" },
      "variant:warning": { "--color-warning": "var(--color-text-yellow)" },
      "variant:error": { "--color-error": "var(--color-text-red)" },
    },
    banner: {
      "status:info": {
        backgroundColor: "var(--color-background-muted)",
        "--color-text-primary": "var(--color-icon-primary)",
        "--color-text-secondary": "var(--color-icon-secondary)",
        "--color-accent": "var(--color-icon-primary)",
      },
    },
  },
});
