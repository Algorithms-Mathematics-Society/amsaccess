"use client";

/**
 * The three check families, animated.
 *
 * This diagram exists because the single most common problemsetting mistake
 * on this platform is not knowing that symbolic rules are a *gate* rather
 * than a scored family — a setter who thinks they are worth a few marks will
 * write them casually, and a candidate then loses the whole problem to one.
 * The animation runs once on view and stops; a looping diagram beside prose
 * competes with the prose.
 */

import { useEffect, useRef, useState } from "react";

const FAMILIES = [
  {
    kind: "I/O tests",
    detail: "tests/N.in → your program → compared with tests/N.ans",
    weight: "weight 2",
    tone: "text-sky-600 border-sky-200 bg-sky-50",
    bar: "bg-sky-400",
  },
  {
    kind: "Behaviour tests",
    detail: "checker/behavior_gtest.cpp compiled against the submission",
    weight: "weight 3",
    tone: "text-violet-600 border-violet-200 bg-violet-50",
    bar: "bg-violet-400",
  },
  {
    kind: "Symbolic rules",
    detail: "source scanned for required and forbidden patterns",
    weight: "gate — not scored",
    tone: "text-rose-600 border-rose-200 bg-rose-50",
    bar: "bg-rose-400",
  },
];

export function JudgingPipeline() {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Respect a reduced-motion preference by showing the finished state.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(FAMILIES.length);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || started.current) return;
      started.current = true;
      FAMILIES.forEach((_, i) => setTimeout(() => setShown(i + 1), 260 * (i + 1)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="space-y-3">
      {FAMILIES.map((family, i) => (
        <div
          key={family.kind}
          className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-500 ${family.tone} ${
            shown > i ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-sm font-semibold">{family.kind}</span>
              <span className="text-xs font-medium opacity-80">{family.weight}</span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-600">{family.detail}</p>
          </div>
          <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/70 sm:block">
            <div
              className={`h-full rounded-full transition-all duration-700 ${family.bar}`}
              style={{ width: shown > i ? "100%" : "0%" }}
            />
          </div>
        </div>
      ))}

      <div
        className={`rounded-xl border border-slate-200 bg-white p-4 transition-all duration-500 ${
          shown >= FAMILIES.length ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-sm text-slate-700">
          I/O and behaviour cases are counted and weighted into partial credit.{" "}
          <strong className="text-rose-600">Symbolic rules are a gate:</strong> one violation
          scores <strong>zero for that problem</strong>, whatever the other families did. Candidates
          are shown your rules in the statement, so write the{" "}
          <code className="rounded bg-slate-100 px-1 text-violet-600">message</code> as an
          instruction they can follow.
        </p>
      </div>
    </div>
  );
}
