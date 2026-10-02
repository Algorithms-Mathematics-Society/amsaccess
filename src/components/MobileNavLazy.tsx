"use client";

import dynamic from "next/dynamic";

// Next 15 only allows `ssr: false` inside Client Components, so the lazy,
// client-only MobileNav import lives here instead of in the server-rendered
// marketing header. Same import, same options, same output.
export const MobileNavLazy = dynamic(
  () => import("@/components/MobileNav").then(m => ({ default: m.MobileNav })),
  { ssr: false }
);
