"use client";

import { useRef, useState } from "react";
import { FileText, Laptop, Code2 } from "lucide-react";
import {
  homeWalkthrough,
  type HomeScreenshotKey,
} from "@/app/(marketing)/home-media";
import { AccessProductScreenshot } from "./AccessProductScreenshot";
import styles from "./AccessProductPreview.module.css";

const stages = [
  {
    id: "prepare",
    label: "Preparation",
    icon: Laptop,
    role: "BEFORE THE ROUND",
    title: "Get familiar with the setup.",
    description:
      "Rehearse the device setup and understand the checks before assessment day.",
    detail: "Candidate preparation",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Code2,
    role: "DURING THE ASSESSMENT",
    title: "Read the problem and write code.",
    description:
      "Read the question, write code, and inspect test results in the dedicated assessment workspace.",
    detail: "Candidate coding workspace",
  },
  {
    id: "submissions",
    label: "Submissions",
    icon: FileText,
    role: "CHECK YOUR ATTEMPTS",
    title: "See what you have submitted.",
    description:
      "Candidates can check their recorded attempts and judging status. These are not published standings or a final contest score.",
    detail: "Candidate submission history",
  },
] as const;

export function AccessProductPreview() {
  const [active, setActive] = useState<HomeScreenshotKey>("prepare");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = stages.find((stage) => stage.id === active)!;
  return (
    <div className={styles.preview} data-home-preview>
      <div className={styles.previewCard}>
        <div className={styles.previewToolbar}>
          <span className={styles.previewLabel}>WORKSPACE VIEWS</span>
          <div
            role="tablist"
            aria-label="Explore the Access workflow"
            className={styles.tabs}
          >
            {stages.map(({ id, label, icon: Icon }, index) => (
              <button
                key={id}
                ref={(el) => {
                  tabs.current[index] = el;
                }}
                id={`preview-tab-${id}`}
                role="tab"
                type="button"
                aria-selected={active === id}
                aria-controls="access-preview-panel"
                tabIndex={active === id ? 0 : -1}
                onClick={() => setActive(id)}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowRight")
                    next = (index + 1) % stages.length;
                  else if (event.key === "ArrowLeft")
                    next = (index + stages.length - 1) % stages.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = stages.length - 1;
                  else return;
                  event.preventDefault();
                  setActive(stages[next].id);
                  tabs.current[next]?.focus();
                }}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div
          id="access-preview-panel"
          className={styles.panel}
          role="tabpanel"
          aria-labelledby={`preview-tab-${active}`}
          tabIndex={0}
        >
          <div className={styles.perspective}>
            <span className={styles.overline}>{selected.role}</span>
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>
            <span className={styles.detail}>{selected.detail}</span>
          </div>
          <AccessProductScreenshot name={active} />
        </div>
      </div>
      {homeWalkthrough.src && (
        <div className={styles.walkthrough} data-home-walkthrough>
          <div className={styles.walkthroughMedia}>
            <video
              controls
              playsInline
              preload="none"
              poster={homeWalkthrough.poster || undefined}
              aria-label="Access sample submission review walkthrough"
              aria-describedby="walkthrough-description"
            >
              <source src={homeWalkthrough.src} />
              {homeWalkthrough.captions && (
                <track
                  kind="captions"
                  src={homeWalkthrough.captions}
                  srcLang="en"
                  label="English"
                  default
                />
              )}
              Your browser does not support this video.
            </video>
          </div>
          <div className={styles.walkthroughCopy}>
            <span className={styles.overline}>REVIEW WALKTHROUGH</span>
            <h3>Reviewing a sample submission</h3>
            <p id="walkthrough-description">
              A short walkthrough of sample submission results and the
              available review controls.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
