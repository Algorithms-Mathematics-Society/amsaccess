"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";

const FADE = "1.5rem";

/** Fade the edge a horizontal scroller can still scroll toward, so hidden items show. */
export function useEdgeMask(ref: RefObject<HTMLElement | null>): CSSProperties | undefined {
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const start = el.scrollLeft > 1;
      const end = el.scrollLeft < max - 1;
      // Most scroll events leave both fades unchanged. Preserve state so
      // those events do not trigger another render.
      setEdges(previous => previous.start === start && previous.end === end
        ? previous
        : { start, end });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);

  if (!edges.start && !edges.end) return undefined;
  const mask = `linear-gradient(to right, ${edges.start ? `transparent, black ${FADE}` : "black"}, ${
    edges.end ? `black calc(100% - ${FADE}), transparent` : "black"
  })`;
  return { maskImage: mask, WebkitMaskImage: mask };
}
