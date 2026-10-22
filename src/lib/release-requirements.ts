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
  "v4.0.0": {
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
const reviewedV231Installers: readonly ReviewedInstaller[] = [
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

const reviewedV400Installers: readonly ReviewedInstaller[] = [
  {
    platform: "linux",
    slot: "rpm",
    id: 663717522,
    label: "AMS.Access-4.0.0-1.x86_64.rpm",
    size: 14719657,
    sha256: "d1e4607547a7707db3a7ea3cd599fa5761d43d71bf79e101a8984e7173673505",
    architecture: "x64",
  },
  {
    platform: "macos",
    slot: "arm64",
    id: 663717582,
    label: "AMS.Access_4.0.0_aarch64.dmg",
    size: 15419028,
    sha256: "8395add210790455470f0be92d0b6dd35784d02ab2c485735204af24dd2dbabe",
    architecture: "arm64",
  },
  {
    platform: "linux",
    slot: "appimage",
    id: 663717525,
    label: "AMS.Access_4.0.0_amd64.AppImage",
    size: 103721464,
    sha256: "f4faaa0cf95f8b5793ca6e460912c8453b5b1836b46f035fc6ebd497912b9f76",
    architecture: "x64",
  },
  {
    platform: "linux",
    slot: "deb",
    id: 663717523,
    label: "AMS.Access_4.0.0_amd64.deb",
    size: 14713866,
    sha256: "cf238d950e3f1276369033867a0e15c4fb399f2e05ac4f39bb9e5ce9ef043466",
    architecture: "x64",
  },
  {
    platform: "windows",
    slot: "exe",
    id: 663716945,
    label: "AMS.Access_4.0.0_x64-setup.exe",
    size: 13316626,
    sha256: "5863fa77b89a4011fd8e0c2b5232f1f582b137c9de3d26e15aa68cdea7c0e7d3",
    architecture: "x64",
  },
  {
    platform: "macos",
    slot: "x64",
    id: 663720148,
    label: "AMS.Access_4.0.0_x64.dmg",
    size: 15989403,
    sha256: "2bf10c74423b2c067c6abbf692749cd2c02977f2953bfedb84be84f88bbcc4b3",
    architecture: "x64",
  },
  {
    platform: "windows",
    slot: "msi",
    id: 663716950,
    label: "AMS.Access_4.0.0_x64_en-US.msi",
    size: 14888960,
    sha256: "24ba896c38812f23b7134f28617f7566c7e7e9157f4cb24bd536d7c19d1b699e",
    architecture: "x64",
  },
];

type ReviewedRelease = {
  releaseId: number;
  requirements: (typeof packageRequirements)[string];
  installers: readonly ReviewedInstaller[];
};

/**
 * Registration is intentionally explicit. A version appears here only after
 * its immutable GitHub release and every exposed installer identity have been
 * reviewed. Unknown, draft, incomplete, or replaced releases fail closed.
 */
const reviewedReleases: Readonly<Record<string, ReviewedRelease>> = {
  "v2.3.1": {
    releaseId: 406470000,
    requirements: packageRequirements["v2.3.1"],
    installers: reviewedV231Installers,
  },
  "v4.0.0": {
    releaseId: 420029337,
    requirements: packageRequirements["v4.0.0"],
    installers: reviewedV400Installers,
  },
};

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
  if (!release) return undefined;
  const reviewedRelease = reviewedReleases[release.version];
  if (!reviewedRelease || release.id !== reviewedRelease.releaseId)
    return undefined;
  const reviewedInstallers = reviewedRelease.installers;

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
  return reviewedRelease.requirements;
}
