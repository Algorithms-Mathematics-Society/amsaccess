"use client";

import { useRef, useState } from "react";
import { FileText, Film, Laptop, Code2 } from "lucide-react";
import {
  homeWalkthrough,
  type HomeScreenshotKey,
} from "@/app/(marketing)/home-media";
import { AccessProductScreenshot } from "./AccessProductScreenshot";
import styles from "./AccessProductPreview.module.css";

const stages = [
  {
    id: "review",
    label: "Review",
    icon: FileText,
    role: "FOR YOUR REVIEWERS",
    title: "Review submissions and attempts.",
    description:
      "Inspect submitted code, see when each attempt was made, and review available session activity.",
    detail: "Organizer workspace",
  },
  {
    id: "prepare",
    label: "Preparation",
    icon: Laptop,
    role: "FOR YOUR CANDIDATES",
    title: "Check assessment and device readiness.",
    description:
      "Find the assigned assessment and check device readiness before entering the workspace.",
    detail: "Before entry",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: Code2,
    role: "FOR YOUR CANDIDATES",
    title: "Read the problem and write code.",
    description:
      "Read the question, write code, and inspect its output in the dedicated assessment workspace.",
    detail: "During the assessment",
  },
] as const;

export function AccessProductPreview() {
  const [active, setActive] = useState<HomeScreenshotKey>("review");
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
      <div
        className={styles.walkthrough}
        data-ready={Boolean(homeWalkthrough.src)}
      >
        <div className={styles.walkthroughMedia}>
          {homeWalkthrough.src ? (
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
          ) : (
            <div className={styles.videoPlaceholder}>
              <Film size={21} strokeWidth={1.4} aria-hidden="true" />
              <span>Walkthrough to be added</span>
            </div>
          )}
        </div>
        <div className={styles.walkthroughCopy}>
          <span className={styles.overline}>REVIEW WALKTHROUGH</span>
          <h3>Reviewing a sample submission</h3>
          <p id="walkthrough-description">
            A short walkthrough of opening a sample submission and viewing the
            related session activity.
          </p>
        </div>
      </div>
    </div>
  );
}
