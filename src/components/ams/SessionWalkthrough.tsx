"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * What a session actually looks like, drawn rather than screenshotted.
 *
 * The screenshots this replaces were two versions out of date and nobody
 * noticed, which is the problem with shipping a picture of software: it
 * rots silently and a visitor cannot tell. This is built from the same
 * tokens as the rest of the page, so it cannot show the wrong colours, and
 * it is four small scenes rather than one crowded frame.
 *
 * It advances on its own and stops the moment anyone touches it. An
 * autoplaying thing that fights the person reading it is worse than a
 * static image.
 */

type Stage = {
  key: string;
  label: string;
  caption: string;
};

const STAGES: Stage[] = [
  { key: "invite", label: "Invite", caption: "A code, sent to the roster. No account to create." },
  { key: "checks", label: "Device checks", caption: "Camera, display, and what else is running." },
  { key: "session", label: "Session", caption: "The editor, the clock, and the judge behind it." },
  { key: "review", label: "Review", caption: "Every verdict and every event, after the fact." },
];

const DWELL_MS = 4200;

export function SessionWalkthrough() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    setPaused(true);
    if (timer.current) clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (paused || reduce) return;
    timer.current = setInterval(() => setActive((i) => (i + 1) % STAGES.length), DWELL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, reduce]);

  return (
    <div className="relative mx-auto w-full lg:origin-center lg:transform-gpu lg:[transform:perspective(1400px)_rotateY(-8deg)_rotateX(2deg)]">
      <div className="relative rounded-[1.15rem] border-[5px] border-[#332d38] bg-[#17141a] p-[5px] shadow-[0_28px_70px_rgba(20,16,27,0.24)] sm:rounded-[1.4rem] sm:border-[7px] sm:p-2">
        <span role="img" aria-label="Camera active" className="absolute left-1/2 top-[4px] z-10 flex -translate-x-1/2 items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full border border-[#817987] bg-[#111014] shadow-inner" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
        </span>
        <div className="overflow-hidden rounded-[0.72rem] border border-white/10 bg-[#14101b] text-white sm:rounded-[0.9rem] lg:flex lg:aspect-[16/10] lg:flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="ml-2 font-body text-xs text-white/40">AMS Access</span>
          </div>

          <div className="relative min-h-[250px] flex-1 p-5 sm:min-h-[280px] sm:p-7 lg:min-h-0 lg:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={STAGES[active].key}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Scene stage={STAGES[active].key} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
            <div role="tablist" aria-label="Session stages" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGES.map((stage, index) => {
                const current = index === active;
                return (
                  <button
                    key={stage.key}
                    role="tab"
                    aria-selected={current}
                    onClick={() => {
                      stop();
                      setActive(index);
                    }}
                    className={`rounded-control px-3 py-2 text-left transition-colors ${
                      current ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span className={`block font-body text-xs font-semibold ${current ? "text-orchid" : "text-white/60"}`}>
                      {stage.label}
                    </span>
                    <span className="mt-0.5 hidden font-body text-[11px] leading-4 text-white/40 sm:block">
                      {stage.caption}
                    </span>
                    {current && !paused && !reduce && (
                      <motion.span
                        key={`${stage.key}-bar`}
                        className="mt-2 block h-px bg-violet-bright/60"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: DWELL_MS / 1000, ease: "linear" }}
                        style={{ transformOrigin: "left" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="relative mx-auto h-9 w-[20%]">
        <span className="absolute inset-x-[34%] top-0 h-full bg-gradient-to-r from-[#37323c] via-[#5d5663] to-[#37323c] [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]" />
      </div>
      <div aria-hidden="true" className="mx-auto -mt-1 h-2 w-[34%] rounded-[50%] border border-[#34303a] bg-gradient-to-b from-[#68616d] to-[#34303a] shadow-[0_4px_9px_rgba(20,16,27,0.2)]" />
      <div aria-hidden="true" className="mx-auto mt-2 flex w-full items-end justify-center gap-[2%]">
        <div className="relative h-11 w-[78%] rounded-md border border-[#302b35] bg-gradient-to-b from-[#55505b] via-[#403b45] to-[#2d2931] p-1 shadow-[0_5px_10px_rgba(20,16,27,0.16)] sm:h-12 sm:p-1.5">
          <div className="grid grid-cols-12 gap-[3px] sm:gap-1">
            {Array.from({ length: 36 }, (_, index) => (
              <span key={index} className="h-1.5 rounded-[2px] border border-black/25 bg-white/[0.11] shadow-[0_1px_0_rgba(255,255,255,0.08)] sm:h-2" />
            ))}
          </div>
          <span className="absolute bottom-1 left-1/2 h-1 w-[18%] -translate-x-1/2 rounded-full bg-black/20 sm:bottom-1.5" />
        </div>
        <div className="relative h-9 w-[9%] rounded-[48%_48%_42%_42%] border border-[#302b35] bg-gradient-to-br from-[#615a67] via-[#47414c] to-[#302c34] shadow-[0_5px_10px_rgba(20,16,27,0.16)] sm:h-10">
          <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-white/15" />
          <span className="absolute left-1/2 top-1.5 h-1 w-0.5 -translate-x-1/2 rounded-full bg-[#aaa2af]/70" />
        </div>
      </div>
    </div>
  );
}

/* ── the four scenes ──────────────────────────────────────────────────── */

function Row({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-control border border-white/10 px-3 py-2.5 font-body text-sm ${
        dim ? "text-white/40" : "text-white/80"
      }`}
    >
      {children}
    </div>
  );
}

function Tick({ ok = true }: { ok?: boolean }) {
  return (
    <span
      className={`font-body text-[11px] font-semibold uppercase tracking-wider ${
        ok ? "text-emerald-400/80" : "text-orchid"
      }`}
    >
      {ok ? "ready" : "checking"}
    </span>
  );
}

function Scene({ stage }: { stage: string }) {
  if (stage === "invite") {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <p className="font-body text-xs uppercase tracking-[0.18em] text-white/40">Session code</p>
        <div className="flex gap-2">
          {"5K9ZEZ".split("").map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-11 w-10 items-center justify-center rounded-control border border-white/15 font-mono text-lg text-white"
            >
              {c}
            </motion.span>
          ))}
        </div>
        <p className="font-body text-sm text-white/50">
          Sent to everyone on the roster. Nothing to install an account for.
        </p>
      </div>
    );
  }

  if (stage === "checks") {
    const checks = ["Camera", "Microphone", "Display", "Restricted apps", "Network"];
    return (
      <div className="space-y-2">
        {checks.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.07 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Row>
              <span>{c}</span>
              <Tick ok={i < 4} />
            </Row>
          </motion.div>
        ))}
      </div>
    );
  }

  if (stage === "session") {
    return (
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-control border border-white/10 p-3 font-mono text-xs leading-6 text-white/70">
          <span className="text-white/30">1</span> <span className="text-sky-300">#include</span>{" "}
          &lt;iostream&gt;
          <br />
          <span className="text-white/30">2</span>{" "}
          <span className="text-sky-300">int</span> main() {"{"}
          <br />
          <span className="text-white/30">3</span>{"   "}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            long long a, b; std::cin &gt;&gt; a &gt;&gt; b;
          </motion.span>
          <br />
          <span className="text-white/30">4</span> {"}"}
        </div>
        <div className="space-y-2">
          <Row>
            <span>Sample 1</span>
            <span className="font-mono text-xs text-emerald-400/80">AC</span>
          </Row>
          <Row>
            <span>Sample 2</span>
            <span className="font-mono text-xs text-emerald-400/80">AC</span>
          </Row>
          <Row dim>
            <span>Time left</span>
            <span className="font-mono text-xs">01:42:08</span>
          </Row>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Row>
        <span>Attempt 3</span>
        <span className="font-mono text-xs text-emerald-400/80">AC &middot; 100</span>
      </Row>
      <Row>
        <span>Attempt 2</span>
        <span className="font-mono text-xs text-red-400/80">WA &middot; 1/2</span>
      </Row>
      <Row dim>
        <span>Left fullscreen</span>
        <span className="font-mono text-xs">00:41:12</span>
      </Row>
      <Row dim>
        <span>Session ended</span>
        <span className="font-mono text-xs">03:00:00</span>
      </Row>
    </div>
  );
}
