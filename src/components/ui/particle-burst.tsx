"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  angle: number;
  radius: number;
  speed: number;
  color: string;
  length: number;
  thickness: number;
}

const colors = [
  "#8B5CF6", // violet-500 (primary accent)
  "#7C3AED", // violet-600
  "#A78BFA", // violet-400
  "#C4B5FD", // violet-300
];

export function ParticleBurst({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    let targetCenterX = 0;
    let targetCenterY = 0;
    let currentCenterX = 0;
    let currentCenterY = 0;
    let initializedMouse = false;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        if (!initializedMouse) {
          targetCenterX = canvas.width / 2;
          targetCenterY = canvas.height / 2;
          currentCenterX = canvas.width / 2;
          currentCenterY = canvas.height / 2;
        }
        initParticles();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetCenterX = e.clientX - rect.left;
      targetCenterY = e.clientY - rect.top;
      initializedMouse = true;
    };

    const initParticles = () => {
      particles = [];
      const numParticles = 400;
      
      const themeColors = dark ? [
        "#A78BFA", // violet-400
        "#C4B5FD", // violet-300
        "#DDD6FE", // violet-200
        "#8B5CF6", // violet-500
      ] : colors;

      for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.max(canvas.width, canvas.height) * 0.8;
        
        particles.push({
          x: 0,
          y: 0,
          angle,
          radius,
          speed: 0.1 + Math.random() * 0.3,
          color: themeColors[Math.floor(Math.random() * themeColors.length)],
          length: 4 + Math.random() * 8,
          thickness: 1.5 + Math.random() * 1.5,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      currentCenterX += (targetCenterX - currentCenterX) * 0.05;
      currentCenterY += (targetCenterY - currentCenterY) * 0.05;

      particles.forEach((p) => {
        // Move particle slowly outward
        p.radius += p.speed;
        if (p.radius > Math.max(canvas.width, canvas.height)) {
          p.radius = Math.random() * 50; // Reset near center
        }

        p.x = currentCenterX + Math.cos(p.angle) * p.radius;
        p.y = currentCenterY + Math.sin(p.angle) * p.radius;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        ctx.beginPath();
        ctx.arc(0, 0, p.thickness * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dark]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg className="hidden absolute">
        <defs>
          <filter id="fluid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="
              1 0 0 0 0  
              0 1 0 0 0  
              0 0 1 0 0  
              0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-60" 
        style={{ filter: "url(#fluid-goo)" }}
      />
    </div>
  );
}
