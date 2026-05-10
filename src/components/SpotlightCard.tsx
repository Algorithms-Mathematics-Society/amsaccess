"use client";

import { useRef } from "react";

type SpotlightCardProps = {
  children: React.ReactNode;
  featured?: boolean;
};

export function SpotlightCard({ children, featured }: SpotlightCardProps) {
  const frameRef = useRef<number | null>(null);
  const pointRef = useRef({ x: 0, y: 0 });

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    pointRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      const { x, y } = pointRef.current;
      element.style.setProperty("--spotlight-x", `${x}px`);
      element.style.setProperty("--spotlight-y", `${y}px`);
      frameRef.current = null;
    });
  };

  return (
    <article
      onPointerMove={handlePointerMove}
      className={`spotlight-card glass-card relative overflow-hidden p-5 ${featured ? "ams-card-featured" : ""}`}
    >
      <div className="spotlight-card-glow pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300" />
      <div className="relative z-10">{children}</div>
    </article>
  );
}
