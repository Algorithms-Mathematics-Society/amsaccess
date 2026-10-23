"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => false;

/** Match the existing md breakpoint without constructing both row trees. */
export function useOrgDesktopLayout() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
