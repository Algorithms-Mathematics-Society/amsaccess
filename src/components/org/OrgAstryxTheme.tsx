"use client";

/*
 * Astryx scope for the org portal. Wrap a page's content in <OrgAstryxTheme>
 * and only that subtree gets Astryx components and the light org theme.
 *
 * Cascade strategy (layer order is declared at the top of globals.css):
 * - Astryx CSS is imported here, not in the root layout, so it ships only in
 *   the CSS of routes that render this provider. Other pages never load it.
 * - Tailwind preflight sits in the `tw-preflight` layer below `astryx-base`,
 *   so it no longer flattens Astryx buttons, inputs and headings.
 * - Site rules and Tailwind utilities stay unlayered: they still win over
 *   Astryx, so className utilities keep working on Astryx components. The
 *   one site rule that would flatten Astryx fonts (`button, input, a {font:
 *   inherit}`) skips elements inside the Theme wrapper div.
 * - The theme's @scope rules exclude <html> (see scripts/build-org-theme.mjs),
 *   so the org shell around this subtree keeps its current look.
 * - The built theme (`theme:build`) is static CSS, so there is no runtime
 *   style injection and no flash on hydration.
 * - mode is fixed to "light": the org portal has no dark theme.
 */
import "@astryxdesign/core/astryx.css";
import "@/theme/orgTheme.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";

import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { orgTheme } from "@/theme/org";

export function OrgAstryxTheme({ children }: { children: ReactNode }) {
  return (
    <Theme theme={orgTheme} mode="light">
      {children}
    </Theme>
  );
}
