const REPO = "Algorithms-Mathematics-Society/ams-access";
const GH_API = `https://api.github.com/repos/${REPO}/releases/latest`;

interface GHAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GHRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: GHAsset[];
}

export interface ReleaseAsset {
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
  macos: { dmg?: ReleaseAsset };
}

function pickAsset(assets: GHAsset[], ext: string): ReleaseAsset | undefined {
  const a = assets.find((a) => a.name.toLowerCase().endsWith(ext));
  if (!a) return undefined;
  return { url: a.browser_download_url, size: a.size, label: a.name };
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
    });

    if (!res.ok) return null;
    const gh: GHRelease = await res.json();
    const { assets } = gh;

    return {
      version: gh.tag_name,
      name: gh.name,
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
      },
    };
  } catch {
    return null;
  }
}
