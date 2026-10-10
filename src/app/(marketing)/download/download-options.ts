import type { LatestRelease, ReleaseAsset } from "@/lib/releases";
import type { DownloadPlatform } from "@/lib/download-platform";

export type DownloadFile = {
  label: string;
  detail: string;
  href: string;
  size: string;
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

function file(
  asset: ReleaseAsset | undefined,
  platform: DownloadPlatform,
  type: string,
  label: string,
  detail: string,
): DownloadFile[] {
  if (!asset) return [];
  const params = new URLSearchParams({ platform, type });
  if (asset.architecture) params.set("architecture", asset.architecture);
  return [
    {
      label,
      detail,
      size: formatSize(asset.size),
      href: "/api/releases/download?" + params.toString(),
    },
  ];
}

export function downloadOptions(
  release: LatestRelease | null,
): DownloadOption[] {
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
      requirement: "Windows 10 / 11 · 64-bit",
      files: winPrimary,
      alternatives: windows?.exe
        ? file(windows.msi, "windows", "msi", "MSI installer", ".msi")
        : [],
      help: "Use the setup installer, or choose MSI if your IT team requires it.",
    },
    {
      id: "macos",
      name: "macOS",
      requirement: "macOS 12 or later",
      files: macFiles,
      alternatives: [],
      help: "Find your chip in the Apple menu → About This Mac.",
    },
    {
      id: "linux",
      name: "Linux",
      requirement: "64-bit · x86_64",
      files: file(
        linux?.appimage,
        "linux",
        "appimage",
        "Download AppImage",
        ".AppImage",
      ),
      alternatives: [
        ...file(linux?.deb, "linux", "deb", "Debian / Ubuntu", ".deb"),
        ...file(linux?.rpm, "linux", "rpm", "Fedora / RHEL", ".rpm"),
      ],
      help: "Choose the package for your distribution. Check device readiness before your round.",
    },
  ];
}
