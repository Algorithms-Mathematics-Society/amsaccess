import { productMedia } from "./product/product-media";

// Reuse the approved product screenshots. Set their src in product-media.ts
// after adding the files to public/product/. Null renders a labelled space.
export const homeScreenshots = {
  review: productMedia.review,
  prepare: productMedia.prepare,
  workspace: productMedia.workspace,
};

export type HomeScreenshotKey = keyof typeof homeScreenshots;

// Optional, user-controlled recording of a sample review. No autoplay.
// Add an MP4/WebM, poster and caption file to public/product/ when ready.
export const homeWalkthrough: {
  src: string | null;
  poster: string | null;
  captions: string | null;
} = {
  src: null,
  poster: null,
  captions: null,
};
