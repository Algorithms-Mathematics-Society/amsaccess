import { downloadHref } from "../../../lib/release-download.ts";
import { requirementsFor } from "../../../lib/release-requirements.ts";
import type { LatestRelease, ReleaseAsset, ReleaseArchitecture } from "@/lib/releases";
import type { DownloadPlatform } from "@/lib/download-platform";

export type DownloadFormat = "exe" | "msi" | "dmg" | "appimage" | "deb" | "rpm";
export type DownloadFile = {
  format: DownloadFormat;
  architecture?: ReleaseArchitecture;
  label: string;
  detail: string;
  href: string;
  size: string;
  bytes: number;
  filename: string;
  version: string;
  sha256?: string;
};
export type DownloadOption = {
  id: DownloadPlatform;
  name: "Windows" | "macOS" | "Linux";
  requirement: string;
  files: DownloadFile[];
  alternatives: DownloadFile[];
  help: string;
};

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  return bytes >= 1_000_000
    ? (bytes / 1_000_000).toFixed(1) + " MB"
    : Math.ceil(bytes / 1_000) + " KB";
}

function releaseFile(
  release: LatestRelease | null,
  asset: ReleaseAsset | undefined,
  platform: DownloadPlatform,
  type: DownloadFormat,
  label: string,
  detail: string,
): DownloadFile[] {
  if (!asset || !release) return [];
  return [
    {
      label,
      format: type,
      architecture: asset.architecture,
      detail: platform !== "macos" && asset.architecture
        ? detail + " · " + (asset.architecture === "arm64" ? "ARM64" : asset.architecture === "x64" ? "64-bit Intel / AMD" : "Universal")
        : detail,
      size: formatSize(asset.size),
      href: downloadHref(release, asset, platform, type),
      filename: asset.label,
      bytes: asset.size,
      version: release.version,
      sha256: asset.sha256,
    },
  ];
}

export function downloadOptions(
  release: LatestRelease | null,
): DownloadOption[] {
  const file = (asset: ReleaseAsset | undefined, platform: DownloadPlatform, type: DownloadFormat, label: string, detail: string) =>
    releaseFile(release, asset, platform, type, label, detail);
  const requirements = requirementsFor(release);
  const windows = release?.windows;
  const mac = release?.macos;
  const linux = release?.linux;
  const winPrimary = windows?.exe
    ? file(
        windows.exe,
        "windows",
        "exe",
        "Download for Windows",
        "Setup · .exe",
      )
    : file(
        windows?.msi,
        "windows",
        "msi",
        "Download for Windows",
        "Installer · .msi",
      );
  const macFiles = [
    ...file(
      mac?.universal,
      "macos",
      "dmg",
      "Download for Mac",
      "Universal · .dmg",
    ),
    ...file(
      mac?.arm64,
      "macos",
      "dmg",
      "Apple silicon",
      "M-series chips · .dmg",
    ),
    ...file(mac?.x64, "macos", "dmg", "Intel", "Intel processors · .dmg"),
  ];
  // A release with an unlabelled DMG must not be described as universal.
  if (!macFiles.length && mac?.dmg) {
    macFiles.push(
      ...file(
        mac.dmg,
        "macos",
        "dmg",
        "Download for Mac",
        "Disk image · confirm chip compatibility with your organizer",
      ),
    );
  }
  return [
    {
      id: "windows",
      name: "Windows",
      requirement: requirements?.windows ?? "Check the installer architecture below",
      files: winPrimary,
      alternatives: windows?.exe
        ? file(windows.msi, "windows", "msi", "MSI installer", ".msi")
        : [],
      help: "Use the setup installer, or choose MSI if your IT team requires it.",
    },
    {
      id: "macos",
      name: "macOS",
      requirement: requirements?.macos ?? "Confirm the macOS requirement for this release",
      files: macFiles,
      alternatives: [],
      help: "Find your chip in the Apple menu → About This Mac.",
    },
    {
      id: "linux",
      name: "Linux",
      requirement: requirements?.linux ?? "Check the package and processor below",
      files: file(
        linux?.appimage,
        "linux",
        "appimage",
        "Download AppImage",
        ".AppImage",
      ),
      alternatives: [
        ...file(linux?.deb, "linux", "deb", "DEB package", ".deb"),
        ...file(linux?.rpm, "linux", "rpm", "RPM package", ".rpm"),
      ],
      help: "Choose the package for your distribution. Check device readiness before your round.",
    },
  ];
}
