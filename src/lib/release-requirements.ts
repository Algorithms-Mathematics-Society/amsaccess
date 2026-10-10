import type { LatestRelease, ReleaseAsset } from "./releases";

// Release-scoped packaging facts; this is not an unverified OS support matrix.
export const REQUIREMENTS_GUIDE_PATH = "/docs/system-requirements";
export const VERIFICATION_GUIDE_PATH = "/docs/verify-download";
export const packageRequirements: Record<
  string,
  {
    windows: string;
    macos: string;
    linux: string;
    notes: string[];
  }
> = {
  "v2.3.1": {
    windows: "Intel / AMD 64-bit · EXE or MSI",
    macos: "macOS 12 or later · Apple silicon or Intel",
    linux: "Intel / AMD 64-bit · DEB, RPM or AppImage",
    notes: [
      "The macOS minimum is a package requirement. An installer matching your processor does not confirm readiness for a particular round.",
      "The Windows installer may need internet access to install Microsoft Edge WebView2. Managed computers may need administrator assistance.",
      "Linux package availability does not establish compatibility with every distribution or desktop environment. Confirm your distribution, version and display session with your organizer.",
      "A tested Windows-version and Linux-distribution support list, and minimum memory/storage requirements, have not been published here. Confirm these before choosing a device for a round.",
    ],
  },
};
// Audited installer identities from docs/release-integrity-v2.3.1.json.
// Only the compact facts needed for matching are part of the public bundle.
type ReviewedInstaller = Pick<
  ReleaseAsset,
  "id" | "label" | "size" | "sha256" | "architecture"
> & {
  platform: "windows" | "linux" | "macos";
  slot: string;
};
const reviewedInstallers: readonly ReviewedInstaller[] = [
  {
    platform: "windows",
    slot: "msi",
    id: 620889677,
    label: "AMS.Access_2.3.1_x64_en-US.msi",
    size: 9150464,
    sha256: "d8cac0377ba07871f85b1d8e6a173d83e3d80015510f9972587ba7017f4dce5a",
    architecture: "x64",
  },
  {
    platform: "windows",
    slot: "exe",
    id: 620889678,
    label: "AMS.Access_2.3.1_x64-setup.exe",
    size: 7613680,
    sha256: "4b29528da41666d59cc0a202e7e00a3c8b909a407b4ab3fe2192098c32beb60e",
    architecture: "x64",
  },
  {
    platform: "linux",
    slot: "appimage",
    id: 620889636,
    label: "AMS.Access_2.3.1_amd64.AppImage",
    size: 86985208,
    sha256: "7f51c2f9b58f8881aa881bdff69fd0620e86a0b7dc543517fc39262637876cd2",
    architecture: "x64",
  },
  {
    platform: "linux",
    slot: "deb",
    id: 620889643,
    label: "AMS.Access_2.3.1_amd64.deb",
    size: 9001878,
    sha256: "209746ce0c9c9ae93228f7aa2051e4178acbc57f158ff87dea9c529d01280c36",
    architecture: "x64",
  },
  {
    platform: "linux",
    slot: "rpm",
    id: 620889637,
    label: "AMS.Access-2.3.1-1.x86_64.rpm",
    size: 9001238,
    sha256: "5cdc4fe221778509772cd22bd00ad9710a75b2685211481bdd116f2b84c18f55",
    architecture: "x64",
  },
  {
    platform: "macos",
    slot: "arm64",
    id: 620893350,
    label: "AMS.Access_2.3.1_aarch64.dmg",
    size: 10020521,
    sha256: "d5baddd65df054ed87a5bf79802ccdf5fbb7bd9e42614c2989a2733f07f6a7b8",
    architecture: "arm64",
  },
  {
    platform: "macos",
    slot: "x64",
    id: 620890562,
    label: "AMS.Access_2.3.1_x64.dmg",
    size: 10552426,
    sha256: "07f453146b2d66d5974bcdaaa34ca32ea396b0757b53ff3fff41332654c496f4",
    architecture: "x64",
  },
];

function matchesReviewed(
  asset: ReleaseAsset | undefined,
  reviewed: ReviewedInstaller,
) {
  return Boolean(
    asset &&
    asset.id === reviewed.id &&
    asset.label === reviewed.label &&
    asset.size === reviewed.size &&
    asset.sha256 === reviewed.sha256 &&
    asset.architecture === reviewed.architecture,
  );
}

export function requirementsFor(release?: LatestRelease | null) {
  if (!release || release.id !== 406470000 || release.version !== "v2.3.1")
    return undefined;

  // A version name alone is not evidence: a publisher can recreate a release
  // or replace an installer under the same tag. Any missing or changed file
  // leaves the requirements unconfirmed until the replacement is reviewed.
  for (const reviewed of reviewedInstallers) {
    const group = release[reviewed.platform] as Record<
      string,
      ReleaseAsset | undefined
    >;
    if (!matchesReviewed(group[reviewed.slot], reviewed)) return undefined;
  }
  for (const platform of ["windows", "linux", "macos"] as const) {
    for (const [slot, asset] of Object.entries(release[platform])) {
      if (!asset) continue;
      // macos.dmg is a compatibility alias for one of the two reviewed DMGs.
      if (platform === "macos" && slot === "dmg") {
        if (
          !reviewedInstallers.some(
            (reviewed) =>
              reviewed.platform === "macos" && matchesReviewed(asset, reviewed),
          )
        )
          return undefined;
      } else if (
        !reviewedInstallers.some(
          (reviewed) =>
            reviewed.platform === platform && reviewed.slot === slot,
        )
      ) {
        return undefined;
      }
    }
  }
  if (!release.macos.dmg) return undefined;
  return packageRequirements["v2.3.1"];
}
