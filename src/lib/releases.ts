const REPO = "Algorithms-Mathematics-Society/ams-access";
const GH_API = `https://api.github.com/repos/${REPO}/releases/latest`;

export type ReleaseArchitecture = "x64" | "arm64" | "universal";
export interface ReleaseAsset {
  id: number;
  architecture?: ReleaseArchitecture;
  url: string;
  size: number;
  label: string;
  sha256?: string;
}
export interface LatestRelease {
  id: number;
  version: string;
  name: string;
  publishedAt: string;
  releaseUrl: string;
  windows: { msi?: ReleaseAsset; exe?: ReleaseAsset };
  linux: { appimage?: ReleaseAsset; deb?: ReleaseAsset; rpm?: ReleaseAsset };
  macos: { dmg?: ReleaseAsset; arm64?: ReleaseAsset; x64?: ReleaseAsset; universal?: ReleaseAsset };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isReleaseVersion(value: unknown): value is string {
  return typeof value === "string" && /^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value) && value.length < 80;
}
export function isInstallerFilename(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._ -]{0,179}$/.test(value);
}
function exactReleaseUrl(value: unknown, path: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" &&
      !url.port && !url.username && !url.password && !url.search && !url.hash &&
      decodeURIComponent(url.pathname) === path;
  } catch { return false; }
}
function architecture(name: string): ReleaseArchitecture | undefined {
  if (/(?:^|[_.-])(?:aarch64|arm64)(?=[_.-]|$)/i.test(name)) return "arm64";
  if (/(?:^|[_.-])(?:x86_64|x64|amd64)(?=[_.-]|$)/i.test(name)) return "x64";
  if (/(?:^|[_.-])universal(?=[_.-]|$)/i.test(name)) return "universal";
}
export function normalizeRelease(value: unknown): LatestRelease | null {
  if (!isRecord(value) || !Number.isSafeInteger(value.id) || Number(value.id) <= 0 ||
      !isReleaseVersion(value.tag_name) || value.draft !== false || value.prerelease !== false ||
      typeof value.published_at !== "string" || !Number.isFinite(Date.parse(value.published_at)) ||
      !exactReleaseUrl(value.html_url, `/${REPO}/releases/tag/${value.tag_name}`) ||
      !Array.isArray(value.assets)) return null;
  const assets: ReleaseAsset[] = [];
  for (const raw of value.assets) {
    if (!isRecord(raw) || !isInstallerFilename(raw.name) || raw.state !== "uploaded" ||
        !Number.isSafeInteger(raw.id) || Number(raw.id) <= 0 ||
        !Number.isSafeInteger(raw.size) || Number(raw.size) <= 0 ||
        !exactReleaseUrl(raw.browser_download_url, `/${REPO}/releases/download/${value.tag_name}/${raw.name}`)) continue;
    assets.push({
      id: Number(raw.id), label: raw.name, size: Number(raw.size), url: raw.browser_download_url,
      architecture: architecture(raw.name),
      ...(typeof raw.digest === "string" && /^sha256:[a-f0-9]{64}$/i.test(raw.digest)
        ? { sha256: raw.digest.slice(7).toLowerCase() } : {}),
    });
  }
  // Ambiguous identities are not safe sources for a download.
  const unique = assets.filter(a => assets.filter(b => a.id === b.id || a.label === b.label).length === 1);
  const pick = (ext: string, arch?: ReleaseArchitecture) =>
    unique.find(a => a.label.toLowerCase().endsWith(ext) && (!arch || a.architecture === arch));
  return {
    id: Number(value.id), version: value.tag_name,
    name: value.tag_name, publishedAt: value.published_at, releaseUrl: value.html_url,
    windows: { msi: pick("_en-us.msi") ?? pick(".msi"), exe: pick("-setup.exe") ?? pick(".exe") },
    linux: { appimage: pick(".appimage"), deb: pick(".deb"), rpm: pick(".rpm") },
    macos: { dmg: pick(".dmg"), arm64: pick(".dmg", "arm64"), x64: pick(".dmg", "x64"), universal: pick(".dmg", "universal") },
  };
}
export async function fetchLatestRelease({ fresh = false }: { fresh?: boolean } = {}): Promise<LatestRelease | null> {
  try {
    const res = await fetch(GH_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? normalizeRelease(await res.json()) : null;
  } catch { return null; }
}

// Retained for the legacy history presentation; public pages use curated release metadata.
export interface ReleaseSummary {
  version: string;
  name: string;
  publishedAt: string;
  releaseUrl: string;
  notes: string;
}
