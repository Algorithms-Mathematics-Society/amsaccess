"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1280px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => false;

/** Match the xl breakpoint without constructing both row trees. Tables need
 *  about 780px beside the sidebar, so tablets (up to 1024px wide) get cards. */
export function useOrgDesktopLayout() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
