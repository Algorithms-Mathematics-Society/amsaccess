"use client";

import { useEffect, useRef } from "react";

interface ProctorNetworkProps {
  nodeCount?:   number;
  connectDist?: number;
  mouseRadius?: number;
}

const BASE_SPEED = 0.35;

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
}

function initNodes(W: number, H: number, count: number): Node[] {
  return Array.from({ length: count }, () => ({
    x:  Math.random() * W,
    y:  Math.random() * H,
    vx: (Math.random() - 0.5) * BASE_SPEED * 2,
    vy: (Math.random() - 0.5) * BASE_SPEED * 2,
    r:  Math.random() * 1.5 + 1.5,
  }));
}

export function ProctorNetwork({
  nodeCount   = 32,
  connectDist = 155,
  mouseRadius = 190,
}: ProctorNetworkProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const nodesRef  = useRef<Node[]>([]);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      nodesRef.current = initNodes(W, H, nodeCount);
    };
    resize();

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      mouseRef.current = (x >= 0 && x <= r.width && y >= 0 && y <= r.height)
        ? { x, y }
        : { x: -9999, y: -9999 };
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize",    resize,  { passive: true });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const nodes = nodesRef.current;
      const { x: mx, y: my } = mouseRef.current;
      const inside = mx > 0;

      // — update positions
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0)  { n.x = 0;  n.vx = Math.abs(n.vx); }
        if (n.x > W)  { n.x = W;  n.vx = -Math.abs(n.vx); }
        if (n.y < 0)  { n.y = 0;  n.vy = Math.abs(n.vy); }
        if (n.y > H)  { n.y = H;  n.vy = -Math.abs(n.vy); }
      }

      // — node-to-node connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d >= connectDist) continue;

          const dmi = Math.hypot(nodes[i].x - mx, nodes[i].y - my);
          const dmj = Math.hypot(nodes[j].x - mx, nodes[j].y - my);
          const nearMouse = inside && Math.min(dmi, dmj) < mouseRadius;
          const t = 1 - d / connectDist;

          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          if (nearMouse) {
            const boost = 1 - Math.min(dmi, dmj) / mouseRadius;
            ctx.strokeStyle = `rgba(192,132,252,${(t * 0.25 + boost * 0.55).toFixed(3)})`;
            ctx.lineWidth = 0.8 + boost * 0.8;
          } else {
            ctx.strokeStyle = `rgba(139,92,246,${(t * 0.13).toFixed(3)})`;
            ctx.lineWidth = 0.5;
          }
          ctx.stroke();
        }
      }

      // — mouse-to-node spokes
      if (inside) {
        for (const n of nodes) {
          const d = Math.hypot(n.x - mx, n.y - my);
          if (d >= mouseRadius) continue;
          const t = 1 - d / mouseRadius;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(n.x, n.y);
          ctx.strokeStyle = `rgba(255,255,255,${(t * 0.22).toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // — nodes
      for (const n of nodes) {
        const d = inside ? Math.hypot(n.x - mx, n.y - my) : mouseRadius + 1;
        const t = d < mouseRadius ? 1 - d / mouseRadius : 0;
        const r = n.r + t * 3.5;

        if (t > 0) {
          const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r + 8);
          grd.addColorStop(0, `rgba(216,180,254,${(t * 0.35).toFixed(3)})`);
          grd.addColorStop(1, "rgba(168,85,247,0)");
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 8, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = t > 0
          ? `rgba(232,210,255,${(0.45 + t * 0.55).toFixed(3)})`
          : `rgba(139,92,246,${(0.25).toFixed(3)})`;
        ctx.fill();
      }

      // — proctor-eye cursor
      if (inside) {
        // inner dot
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
        // ring 1
        ctx.beginPath();
        ctx.arc(mx, my, 9, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // ring 2 dashed
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(mx, my, 18, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(192,132,252,0.2)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize",    resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
