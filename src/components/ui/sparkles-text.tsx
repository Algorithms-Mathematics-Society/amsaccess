"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Sparkle = ({
  id,
  style,
  color,
}: {
  id: string;
  style: any;
  color: string;
}) => {
  return (
    <motion.svg
      key={id}
      style={style}
      className="pointer-events-none absolute z-20"
      initial={{ opacity: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        repeatDelay: Math.random() * 2 + 1,
      }}
      width="20"
      height="20"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M80 0C80 0 84.2846 41.2925 101.496 58.504C118.707 75.7154 160 80 160 80C160 80 118.707 84.2846 101.496 101.496C84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 58.504 101.496C41.2925 84.2846 0 80 0 80C0 80 41.2925 75.7154 58.504 58.504C75.7154 41.2925 80 0 80 0Z"
        fill={color}
      />
    </motion.svg>
  );
};

export const SparklesText = ({
  text,
  colors = { first: "#A78BFA", second: "#9c40ff" },
  className,
  sparklesCount = 5,
}: {
  text: string;
  colors?: { first: string; second: string };
  className?: string;
  sparklesCount?: number;
}) => {
  const [sparkles, setSparkles] = useState<any[]>([]);

  useEffect(() => {
    const generateSparkles = () => {
      return Array.from({ length: sparklesCount }).map((_, i) => ({
        id: `sparkle-${i}-${Date.now()}`,
        style: {
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
        },
        color: Math.random() > 0.5 ? colors.first : colors.second,
      }));
    };
    setSparkles(generateSparkles());
    const interval = setInterval(() => {
      setSparkles(generateSparkles());
    }, 3000);
    return () => clearInterval(interval);
  }, [sparklesCount, colors]);

  return (
    <div
      className={cn("text-5xl font-bold relative inline-block", className)}
    >
      {sparkles.map((sparkle) => (
        <Sparkle
          key={sparkle.id}
          id={sparkle.id}
          style={sparkle.style}
          color={sparkle.color}
        />
      ))}
      <span className="relative z-10">{text}</span>
    </div>
  );
};
