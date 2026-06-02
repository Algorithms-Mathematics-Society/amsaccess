"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { BorderBeam } from "./ui/border-beam";

type SpotlightCardProps = {
  children: React.ReactNode;
  featured?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function SpotlightCard({ children, featured, className = "", style }: SpotlightCardProps) {
  const frameRef = useRef<number | null>(null);
  // Store raw pointer coords; rect is computed inside RAF to avoid forced reflow.
  const clientRef = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    clientRef.current = { x: event.clientX, y: event.clientY };
    elementRef.current = event.currentTarget;

    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      const el = elementRef.current;
      if (!el) return;
      // getBoundingClientRect read + CSS var write both happen inside RAF —
      // no interleaved layout thrash with the event handler.
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--spotlight-x", `${clientRef.current.x - rect.left}px`);
      el.style.setProperty("--spotlight-y", `${clientRef.current.y - rect.top}px`);
      frameRef.current = null;
    });
  };

  return (
    <article
      onPointerMove={handlePointerMove}
      className={`spotlight-card glass-card relative overflow-hidden p-5 ${featured ? "ams-card-featured border border-purple-500/20" : ""} ${className}`}
      style={style}
    >
      <div className="spotlight-card-glow pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300" />
      <div className="relative z-10">{children}</div>
      {featured && <BorderBeam size={250} duration={12} delay={9} />}
    </article>
  );
}
