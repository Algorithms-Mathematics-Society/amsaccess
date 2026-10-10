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
    <div className="rounded-panel border border-ink/10 bg-espresso">
      {/* The frame. A window chrome, so it reads as the application without
          pretending to be a photograph of one. */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-2 font-body text-xs text-white/40">AMS Access</span>
      </div>

      <div className="relative min-h-[280px] p-6 sm:min-h-[320px] sm:p-8">
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

      <div className="border-t border-white/10 p-3">
        <div
          role="tablist"
          aria-label="Session stages"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
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
                <span
                  className={`block font-body text-xs font-semibold ${
                    current ? "text-gold-bright" : "text-white/60"
                  }`}
                >
                  {stage.label}
                </span>
                <span className="mt-0.5 block font-body text-[11px] leading-4 text-white/40">
                  {stage.caption}
                </span>
                {/* The progress bar doubles as the only "this is playing"
                    signal, so it disappears when paused rather than sitting
                    there frozen and looking broken. */}
                {current && !paused && !reduce && (
                  <motion.span
                    key={`${stage.key}-bar`}
                    className="mt-2 block h-px bg-gold-bright/60"
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
        ok ? "text-emerald-400/80" : "text-gold-bright"
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
              className="flex h-11 w-10 items-center justify-center rounded-control border border-white/15 font-mono text-lg text-cream"
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
