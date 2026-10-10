// Add approved screenshots to public/product/ and set the corresponding src.
// Keep null until an image exists: the page intentionally renders a labelled
// space instead of requesting a missing asset or showing invented product UI.
export type ProductMediaKey = "organize" | "prepare" | "workspace" | "review";

type ProductMedia = {
  src: string | null;
  alt: string;
  title: string;
  caption: string;
  surface: string;
};

export const productMedia: Record<ProductMediaKey, ProductMedia> = {
  organize: {
    src: null,
    alt: "Access organizer workspace showing an assessment and its launch checklist.",
    title: "Organizer workspace",
    caption: "Questions, candidates, and launch preparation.",
    surface: "Web workspace",
  },
  prepare: {
    src: null,
    alt: "Access desktop home showing assigned assessments and device readiness checks.",
    title: "Candidate preparation",
    caption: "Assigned assessments and device checks.",
    surface: "Desktop app",
  },
  workspace: {
    src: null,
    alt: "Access coding workspace with a problem statement, code editor, and execution output.",
    title: "The coding workspace",
    caption: "Problem statement, code editor, and execution output.",
    surface: "Desktop app",
  },
  review: {
    src: null,
    alt: "Access organizer results view showing per-question scores and a candidate’s submission history.",
    title: "Results & submission review",
    caption: "Assessment results and submission history.",
    surface: "Web workspace",
  },
};
