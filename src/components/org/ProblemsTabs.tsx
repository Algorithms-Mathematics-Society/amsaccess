"use client";

import { useId, useState } from "react";
import { OrgTabPanel, OrgTabs } from "./OrgTabs";
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

  const id = useId();
  const tabs = ["catalogue", "setting"] as const;

  return (
    <div className="px-8 py-6">
      <OrgTabs
        id={id}
        label="Problems"
        tabs={tabs}
        active={tab}
        onSelect={setTab}
        className="mb-6 gap-1 border-b border-slate-200"
      >
        {(value) => (value === "catalogue" ? "Catalogue" : "Problemsetting")}
      </OrgTabs>
      <OrgTabPanel id={id} value="catalogue" active={tab}>
        {tab === "catalogue" && <ProblemsView embedded />}
      </OrgTabPanel>
      <OrgTabPanel id={id} value="setting" active={tab}>
        {tab === "setting" && <ProblemSetting />}
      </OrgTabPanel>
    </div>
  );
}
