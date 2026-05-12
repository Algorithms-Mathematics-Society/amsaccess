"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface LazyMountProps {
  children: ReactNode;
  /** How far before the element enters the viewport to start rendering. Default: "200px" */
  rootMargin?: string;
  minHeight?: number;
}

/**
 * Defers rendering children until the mount point scrolls near the viewport.
 * Keeps below-fold client islands out of the initial hydration pass.
 */
export function LazyMount({ children, rootMargin = "200px", minHeight }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={!visible && minHeight ? { minHeight } : undefined}>
      {visible ? children : null}
    </div>
  );
}
