"use client";

import { useState } from "react";
import { ProblemsView } from "./ProblemsView";
import { ProblemSetting } from "./authoring/ProblemSetting";

/**
 * Two ways a problem gets here: uploaded as a built package, or written in
 * the portal. Tabs rather than two nav entries, because they are the same
 * noun and a setter switches between them constantly: upload the ones you
 * already have, write the next one.
 *
 * Catalogue first. Most visits are to look something up, not to start
 * writing, and defaulting to the editor would put a half-built problem in
 * front of someone who came to check a time limit.
 */
export function ProblemsTabs() {
  const [tab, setTab] = useState<"catalogue" | "setting">("catalogue");

  return (
    <div className="px-8 py-6">
      <div
        role="tablist"
        aria-label="Problems"
        className="mb-6 inline-flex rounded-lg border border-slate-200 p-0.5"
      >
        {(
          [
            ["catalogue", "Catalogue"],
            ["setting", "Problemsetting"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
              tab === key ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "catalogue" ? <ProblemsView embedded /> : <ProblemSetting />}
    </div>
  );
}
