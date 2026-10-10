const REPO = "Algorithms-Mathematics-Society/ams-access";
const GH_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const GH_LIST = `https://api.github.com/repos/${REPO}/releases?per_page=20`;

interface GHAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GHRelease {
  tag_name: string;
  name: string | null;
  published_at: string;
  html_url: string;
  assets: GHAsset[];
}

export type ReleaseArchitecture = "x64" | "arm64" | "universal";

export interface ReleaseAsset {
  architecture?: ReleaseArchitecture;
  url: string;
  size: number;
  label: string;
}

export interface LatestRelease {
  version: string;
  name: string;
  publishedAt: string;
  releaseUrl: string;
  windows: { msi?: ReleaseAsset; exe?: ReleaseAsset };
  linux: { appimage?: ReleaseAsset; deb?: ReleaseAsset; rpm?: ReleaseAsset };
  macos: {
    dmg?: ReleaseAsset;
    arm64?: ReleaseAsset;
    x64?: ReleaseAsset;
    universal?: ReleaseAsset;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReleaseUrl(
  value: unknown,
  kind: "download" | "tag",
): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname.startsWith(`/${REPO}/releases/${kind}/`) &&
      url.pathname.length > `/${REPO}/releases/${kind}/`.length
    );
  } catch {
    return false;
  }
}

function isGHRelease(value: unknown): value is GHRelease & {
  draft?: boolean;
  prerelease?: boolean;
  body?: string;
} {
  return (
    isRecord(value) &&
    typeof value.tag_name === "string" &&
    value.tag_name.trim().length > 0 &&
    (typeof value.name === "string" || value.name === null) &&
    typeof value.published_at === "string" &&
    Number.isFinite(Date.parse(value.published_at)) &&
    isReleaseUrl(value.html_url, "tag") &&
    Array.isArray(value.assets) &&
    (value.draft === undefined || typeof value.draft === "boolean") &&
    (value.prerelease === undefined || typeof value.prerelease === "boolean")
  );
}

function assetArchitecture(name: string): ReleaseArchitecture | undefined {
  if (/(?:^|[_.-])(?:aarch64|arm64)(?=[_.-]|$)/i.test(name)) return "arm64";
  if (/(?:^|[_.-])(?:x86_64|x64|amd64)(?=[_.-]|$)/i.test(name)) return "x64";
  if (/(?:^|[_.-])universal(?=[_.-]|$)/i.test(name)) return "universal";
  return undefined;
}

function pickAsset(
  assets: unknown[],
  ext: string,
  architecture?: ReleaseArchitecture,
): ReleaseAsset | undefined {
  for (const candidate of assets) {
    if (
      !isRecord(candidate) ||
      typeof candidate.name !== "string" ||
      !candidate.name.toLowerCase().endsWith(ext) ||
      !isReleaseUrl(candidate.browser_download_url, "download") ||
      typeof candidate.size !== "number" ||
      !Number.isSafeInteger(candidate.size) ||
      candidate.size < 0
    )
      continue;
    const detected = assetArchitecture(candidate.name);
    if (architecture && detected !== architecture) continue;
    return {
      url: candidate.browser_download_url,
      size: candidate.size,
      label: candidate.name,
      ...(detected ? { architecture: detected } : {}),
    };
  }
  return undefined;
}

export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  try {
    const res = await fetch(GH_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;
    const gh: unknown = await res.json();
    if (!isGHRelease(gh) || gh.draft || gh.prerelease) return null;
    const { assets } = gh;

    return {
      version: gh.tag_name,
      name: gh.name || gh.tag_name,
      publishedAt: gh.published_at,
      releaseUrl: gh.html_url,
      windows: {
        msi: pickAsset(assets, "_en-us.msi") ?? pickAsset(assets, ".msi"),
        exe: pickAsset(assets, "-setup.exe") ?? pickAsset(assets, ".exe"),
      },
      linux: {
        appimage: pickAsset(assets, ".appimage"),
        deb: pickAsset(assets, ".deb"),
        rpm: pickAsset(assets, ".rpm"),
      },
      macos: {
        dmg: pickAsset(assets, ".dmg"),
        arm64: pickAsset(assets, ".dmg", "arm64"),
        x64: pickAsset(assets, ".dmg", "x64"),
        universal: pickAsset(assets, ".dmg", "universal"),
      },
    };
  } catch {
    return null;
  }
}

export interface ReleaseSummary {
  version: string;
  name: string;
  publishedAt: string;
  releaseUrl: string;
  /** The release body as GitHub holds it, trimmed. May be empty. */
  notes: string;
}

/**
 * Recent releases, newest first.
 *
 * Reads GitHub rather than a hand-written list. The hand-written one said
 * v0.2.0 in May 2026 while the product shipped v2.3.1, and nothing in the
 * page could have noticed: a changelog maintained separately from the
 * releases it describes is a second source of truth that only ever drifts
 * one way.
 *
 * Drafts and prereleases are left out. A draft is not released yet, and
 * publishing its notes would announce a build nobody can download.
 */
export async function fetchReleases(): Promise<ReleaseSummary[]> {
  try {
    const res = await fetch(GH_LIST, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const releases: unknown = await res.json();
    if (!Array.isArray(releases)) return [];
    return releases
      .filter(isGHRelease)
      .filter((r) => !r.draft && !r.prerelease)
      .map((r) => ({
        version: r.tag_name,
        name: r.name || r.tag_name,
        publishedAt: r.published_at,
        releaseUrl: r.html_url,
        notes: typeof r.body === "string" ? r.body.trim() : "",
      }));
  } catch {
    return [];
  }
}
