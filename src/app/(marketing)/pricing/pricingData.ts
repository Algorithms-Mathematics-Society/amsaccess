// Broad use cases are documented in docs/product/pricing.md.
// Prices, numeric limits, service levels, and availability require confirmation.
export const assessmentOptions = [
  {
    name: "Pilot",
    audience: "A first assessment",
    description:
      "If you are considering Access for a first assessment, include the question format and approximate number of candidates.",
    detail: "Useful details: assessment format and candidate count.",
  },
  {
    name: "Event",
    audience: "A single round",
    description:
      "For a hiring round, contest, or scheduled assessment, share the date and how many candidates may participate at the same time.",
    detail:
      "Useful details: date and number of candidates taking part at once.",
  },
  {
    name: "Institution",
    audience: "Recurring assessments",
    description:
      "If several teams or programs would use Access, describe how often you run assessments and how your reviewers work together.",
    detail: "Useful details: assessment frequency and participating teams.",
  },
  {
    name: "Enterprise",
    audience: "Specific requirements",
    description:
      "List any procurement, integration, or deployment requirements and ask the team to confirm which ones Access can support.",
    detail: "Useful details: required capabilities and any approval steps.",
  },
] as const;
