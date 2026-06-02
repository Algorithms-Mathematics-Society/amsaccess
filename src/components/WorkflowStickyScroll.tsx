"use client";

import { StickyScroll } from "./ui/sticky-scroll-reveal";
import { WorkflowVisual } from "./WorkflowVisual";

const workflowSections = [
  {
    eyebrow: "Controlled environment",
    title: "Put the evaluation inside a product with edges.",
    description: "A serious round should not depend on a browser tab, a meeting link, and a policy document. Access by AMS gives the session a clear operating surface.",
    visual: "operations"
  },
  {
    eyebrow: "Review context",
    title: "A submission is evidence. A session is context.",
    description: "Answers matter, but so does the path around them. Timelines make the review legible without turning judgment into automation.",
    visual: "code"
  },
  {
    eyebrow: "Human judgment",
    title: "Keep reviewers close to the work.",
    description: "Access by AMS packages written responses, status, timestamps, and activity history so reviewers can decide with confidence and restraint.",
    visual: "handoff"
  }
];

export function WorkflowStickyScroll() {
  const content = workflowSections.map((section) => ({
    title: section.title,
    description: section.description,
    content: (
      <div className="w-full h-full flex items-center justify-center bg-black/40 p-4">
        <WorkflowVisual kind={section.visual} />
      </div>
    ),
  }));

  return (
    <div className="w-full">
      <StickyScroll content={content} />
    </div>
  );
}
