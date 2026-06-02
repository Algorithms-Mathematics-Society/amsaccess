"use client";

import { useEffect, useRef } from "react";

const RINGS = [
  { size: 160,  speed: 0.20, peak: 0.14 },
  { size: 300,  speed: 0.12, peak: 0.11 },
  { size: 460,  speed: 0.07, peak: 0.09 },
  { size: 620,  speed: 0.04, peak: 0.07 },
  { size: 800,  speed: 0.025, peak: 0.05 },
];

function gradient(peak: number) {
  return [
    `transparent 20%`,
    `rgba(139,92,246,${(peak * 0.15).toFixed(3)}) 45%`,
    `rgba(139,92,246,${peak.toFixed(3)}) 68%`,
    `rgba(168,85,247,${(peak * 0.4).toFixed(3)}) 85%`,
    `transparent 100%`,
  ].join(", ");
}

export function FluidRings() {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<(HTMLDivElement | null)[]>([]);
  const posRef   = useRef(RINGS.map(() => ({ x: -9999, y: -9999 })));
  const tgtRef   = useRef<{ x: number; y: number } | null>(null);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const center = () => {
      const r = wrap.getBoundingClientRect();
      return { x: r.width / 2, y: r.height / 2 };
    };

    // Initialise positions to centre so first animation is smooth
    const c = center();
    posRef.current.forEach((p) => { p.x = c.x; p.y = c.y; });

    const onMove = (e: MouseEvent) => {
      // Recalculate every move so scroll never breaks the mapping
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x >= 0 && x <= r.width && y >= 0 && y <= r.height) {
        tgtRef.current = { x, y };
      } else {
        tgtRef.current = null; // drift back to centre
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    const animate = () => {
      const fallback = center();
      const tx = tgtRef.current?.x ?? fallback.x;
      const ty = tgtRef.current?.y ?? fallback.y;

      posRef.current.forEach((pos, i) => {
        pos.x += (tx - pos.x) * RINGS[i].speed;
        pos.y += (ty - pos.y) * RINGS[i].speed;
        const el = ringsRef.current[i];
        if (el) {
          const s = RINGS[i].size;
          el.style.transform = `translate(${pos.x - s / 2}px, ${pos.y - s / 2}px)`;
        }
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {RINGS.map((ring, i) => (
        <div
          key={i}
          ref={(el) => { ringsRef.current[i] = el; }}
          className="absolute top-0 left-0"
          style={{
            width:        ring.size,
            height:       ring.size,
            borderRadius: "50%",
            background:   `radial-gradient(circle, ${gradient(ring.peak)})`,
            willChange:   "transform",
          }}
        />
      ))}
    </div>
  );
}
