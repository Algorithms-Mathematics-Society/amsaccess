"use client";

import { useEffect } from "react";

let locks = 0;
let previousOverflow = "";

/** Nested dialogs can close in either order; the last one restores scrolling. */
export function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    if (locks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}
