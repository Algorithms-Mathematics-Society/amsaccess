import { isInstallerFilename, isReleaseVersion, type LatestRelease, type ReleaseAsset, type ReleaseArchitecture } from "./releases.ts";

export type DownloadPlatform = "windows" | "macos" | "linux";
export type DownloadFormat = "msi" | "exe" | "dmg" | "appimage" | "deb" | "rpm";
export type DownloadIdentity = {
  platform: DownloadPlatform;
  type: DownloadFormat;
  architecture?: ReleaseArchitecture;
  version: string;
  release: number;
  asset: number;
  filename: string;
  bytes: number;
  sha256: string;
};
const formats = { windows: ["msi", "exe"], macos: ["dmg"], linux: ["appimage", "deb", "rpm"] };
const keys = ["platform", "type", "architecture", "version", "release", "asset", "filename", "bytes", "sha256"];
function positiveInteger(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}
export function parseDownloadIdentity(params: URLSearchParams): DownloadIdentity | null {
  if ([...params.keys()].some(key => !keys.includes(key) || params.getAll(key).length !== 1)) return null;
  const platform = params.get("platform");
  const type = params.get("type");
  const architecture = params.get("architecture");
  const version = params.get("version");
  const release = positiveInteger(params.get("release"));
  const asset = positiveInteger(params.get("asset"));
  const filename = params.get("filename");
  const bytes = positiveInteger(params.get("bytes"));
  const sha256 = params.get("sha256");
  if (!platform || !Object.hasOwn(formats, platform) || !type ||
      !(formats[platform as DownloadPlatform] as string[]).includes(type) ||
      (architecture !== null && !["x64", "arm64", "universal"].includes(architecture)) ||
      !isReleaseVersion(version) || !release || !asset || !isInstallerFilename(filename) ||
      !bytes || !sha256 || !(sha256 === "unavailable" || /^[a-f0-9]{64}$/.test(sha256))) return null;
  return { platform: platform as DownloadPlatform, type: type as DownloadFormat,
    ...(architecture ? { architecture: architecture as ReleaseArchitecture } : {}),
    version, release, asset, filename, bytes, sha256 };
}
export function downloadHref(release: LatestRelease, asset: ReleaseAsset, platform: DownloadPlatform, type: DownloadFormat): string {
  const params = new URLSearchParams({
    platform, type, version: release.version, release: String(release.id), asset: String(asset.id),
    filename: asset.label, bytes: String(asset.size), sha256: asset.sha256 ?? "unavailable",
  });
  if (asset.architecture) params.set("architecture", asset.architecture);
  return "/api/releases/download?" + params.toString();
}
export function resolveDownload(release: LatestRelease, expected: DownloadIdentity): ReleaseAsset | null {
  if (release.version !== expected.version || release.id !== expected.release) return null;
  const group = release[expected.platform];
  const asset = expected.platform === "macos" && expected.architecture
    ? release.macos[expected.architecture]
    : (group as Record<string, ReleaseAsset | undefined>)[expected.type];
  return asset && asset.id === expected.asset && asset.label === expected.filename &&
    asset.size === expected.bytes && asset.architecture === expected.architecture &&
    (asset.sha256 ?? "unavailable") === expected.sha256 ? asset : null;
}
