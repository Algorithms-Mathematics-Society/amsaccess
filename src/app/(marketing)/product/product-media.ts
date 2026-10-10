// Only approved, neutral sample screenshots are published.
// Organizer captures remain separate from the desktop candidate UI.
export type ProductMediaKey = "organize" | "prepare" | "workspace" | "review" | "submissions" | "hardware";

type ProductMedia = {
  src: string | null;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: string;
  surface: string;
};

export const productMedia: Record<ProductMediaKey, ProductMedia> = {
  organize: {
    src: null, width: 1600, height: 1100,
    alt: "Access organizer workspace showing an assessment and its launch checklist.",
    title: "Organizer workspace",
    caption: "Questions, candidates, and launch preparation.",
    surface: "Web workspace",
  },
  prepare: {
    src: "/product/device-preparation-light.png", width: 2200, height: 1440,
    alt: "Access practice setup introduction covering the workspace, device, camera, audio and connection before beginning setup.",
    title: "Candidate preparation",
    caption: "Rehearse device setup before the assessment.",
    surface: "Desktop app",
  },
  workspace: {
    src: "/product/coding-workspace-light.png", width: 2440, height: 1780,
    alt: "Access coding workspace with a sample Binary Search problem, C++ solution and an example accepted submission in Test Results.",
    title: "The coding workspace",
    caption: "The problem, code and test results in one workspace.",
    surface: "Desktop app",
  },
  review: {
    src: null, width: 1600, height: 1200,
    alt: "Access organizer results view showing per-question scores and a candidate’s submission history.",
    title: "Results & submission review",
    caption: "Assessment results and submission history.",
    surface: "Web workspace",
  },
  submissions: {
    src: "/product/candidate-submissions-light.png", width: 1960, height: 1220,
    alt: "Candidate submission history for a sample coding round: Binary Search accepted and Balanced Brackets not submitted.",
    title: "Candidate submissions",
    caption: "Recorded attempts and judging status, visible to the candidate.",
    surface: "Desktop app",
  },
  hardware: {
    src: "/product/hardware-settings-light.png", width: 2880, height: 2000,
    alt: "Access Settings, Hardware tab, with camera preview off and controls to select a camera, start the microphone and test speakers.",
    title: "Camera and audio settings",
    caption: "Find camera, microphone and speaker controls in Settings.",
    surface: "Desktop app",
  },
};
