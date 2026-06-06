"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuroraBackground } from "./ui/aurora-background";
import { ShimmerButton } from "./ui/shimmer-button";
import { TypewriterEffectSmooth } from "./ui/typewriter-effect";

export function AnimatedHero() {
  const words = [
    { text: "Serious" },
    { text: "evaluations" },
    { text: "need" },
    { text: "a" },
    { text: "room", className: "text-purple-400 dark:text-purple-400" },
    { text: "of" },
    { text: "their" },
    { text: "own." },
  ];
  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative flex flex-col gap-4 items-center justify-center px-4"
      >
        <TypewriterEffectSmooth words={words} className="mb-4 hidden md:flex" />
        <h1
          className="md:hidden bg-gradient-to-br from-white to-slate-400 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent mb-4"
        >
          Serious evaluations <br /> need a room of their own.
        </h1>
        <p
          className="mx-auto max-w-md text-sm leading-7 text-slate-300/70 md:max-w-lg md:text-base md:leading-8 text-center"
        >
          A desktop assessment shell for fullscreen written rounds, activity evidence, and reviewer-ready timelines.
        </p>
        <div
          className="mt-8 flex flex-col justify-center gap-4 md:flex-row"
        >
          <Link href="/#download" className="w-full md:w-auto">
            <ShimmerButton className="w-full md:w-auto shadow-[0_12px_40px_rgba(255,255,255,0.08)] group hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]">
              <span className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
                Download AMS Access
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </span>
            </ShimmerButton>
          </Link>
          <Link
            className="inline-flex h-[3.25rem] w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-8 text-sm font-medium text-white shadow-sm backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white md:w-auto"
            href="/#pricing"
          >
            View Pricing
          </Link>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
