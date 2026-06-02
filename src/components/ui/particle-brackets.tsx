import React from "react";

export function ParticleBrackets({ className = "" }: { className?: string }) {
  // We'll generate a static SVG that looks like the particle brackets
  const generateParticles = (isLeft: boolean) => {
    const particles = [];
    for (let i = 0; i < 200; i++) {
      // rough path of a bracket
      const t = i / 200;
      let x = 0;
      let y = t * 200;
      
      // shape function
      if (y < 40) {
        x = 40 - Math.sqrt(1600 - Math.pow(y - 40, 2));
      } else if (y > 160) {
        x = 40 - Math.sqrt(1600 - Math.pow(y - 160, 2));
      } else if (y > 80 && y < 120) {
        x = 20 + Math.sqrt(400 - Math.pow(y - 100, 2));
      } else {
        x = 40;
      }

      if (!isLeft) x = 80 - x;

      // add some jitter
      x += (Math.random() - 0.5) * 15;
      y += (Math.random() - 0.5) * 5;

      const colors = [
        "#8B5CF6", // violet-500
        "#7C3AED", // violet-600
        "#A78BFA", // violet-400
        "#C4B5FD", // violet-300
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const radius = 1 + Math.random() * 1.5;

      particles.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={radius}
          fill={color}
        />
      );
    }
    return particles;
  };

  return (
    <div className={`flex justify-between items-center w-full max-w-sm mx-auto ${className} relative`}>
      <svg className="hidden absolute">
        <defs>
          <filter id="bracket-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="
              1 0 0 0 0  
              0 1 0 0 0  
              0 0 1 0 0  
              0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <svg width="100" height="200" viewBox="0 0 100 200" className="opacity-80" style={{ filter: "url(#bracket-goo)" }}>
        {generateParticles(true)}
      </svg>
      <svg width="100" height="200" viewBox="0 0 100 200" className="opacity-80" style={{ filter: "url(#bracket-goo)" }}>
        {generateParticles(false)}
      </svg>
    </div>
  );
}
