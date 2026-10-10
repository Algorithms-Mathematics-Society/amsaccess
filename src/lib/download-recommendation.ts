import type { DownloadOption, DownloadFile } from "@/app/(marketing)/download/download-options";
import type { DownloadDeviceDetails } from "./download-platform";

export type LinuxFamily = "deb" | "rpm" | "appimage" | "";
export type DownloadRecommendation = {
  kind: "ready" | "choose-system" | "choose-chip" | "choose-linux" | "mobile" | "unavailable";
  title: string;
  description: string;
  file?: DownloadFile;
};

export function recommendDownload(
  options: DownloadOption[],
  details: DownloadDeviceDetails,
  linuxFamily: LinuxFamily,
): DownloadRecommendation {
  const { device, architecture } = details;
  if (!options.some((option) => option.files.length + option.alternatives.length)) return {
    kind: "unavailable", title: "Downloads are unavailable right now.",
    description: "Try again shortly, or contact your organizer if your assessment is approaching.",
  };
  if (device === "mobile") return {
    kind: "mobile", title: "Use a desktop or laptop.",
    description: "Access assessments run in the desktop app. Open this page on the computer you’ll use, or choose that computer’s details below.",
  };
  if (device === "unknown") return {
    kind: "choose-system", title: "Find your download.",
    description: "Choose the operating system of the computer you’ll use for your assessment.",
  };
  const option = options.find((item) => item.id === device);
  const files = option ? [...option.files, ...option.alternatives] : [];
  const unavailable: DownloadRecommendation = {
    kind: "unavailable", title: "No matching download is available.",
    description: "The published installers don’t include a confirmed match for these device details. Check your selection or ask your organizer for help.",
  };
  if (!files.length || architecture === "unsupported") return unavailable;
  const universal = device === "macos"
    ? files.find((file) => file.architecture === "universal") : undefined;
  if (architecture === "unknown" && !universal) return {
    kind: "choose-chip",
    title: device === "macos" ? "One detail: which Mac chip?" : "Confirm your processor.",
    description: device === "macos"
      ? "This browser hasn’t identified your chip. Choose Apple silicon or Intel to find the matching installer."
      : "This browser hasn’t identified your processor. Confirm it below so we can match the installer.",
  };
  const matches = files.filter((file) =>
    file.architecture === architecture || (device === "macos" && file.architecture === "universal"),
  );
  if (!matches.length) return unavailable;
  let file: DownloadFile | undefined;
  if (device === "macos") {
    file = matches.find((item) => item.architecture === architecture) ?? universal;
  } else if (device === "windows") {
    file = matches.find((item) => item.format === "exe")
      ?? matches.find((item) => item.format === "msi");
  } else {
    if (!linuxFamily) return {
      kind: "choose-linux", title: "Which Linux distribution?",
      description: "Choose your distribution to find its package. AppImage is also an option for supported systems.",
    };
    file = matches.find((item) => item.format === linuxFamily);
  }
  if (!file) return unavailable;
  return {
    kind: "ready",
    title: device === "macos" ? "Access for Mac."
      : device === "windows" ? "Access for Windows." : "Access for Linux.",
    description: device === "linux" && linuxFamily === "appimage"
      ? "An AppImage is available for this processor. Check the setup guide for system requirements."
      : "This installer matches these device details.",
    file,
  };
}
