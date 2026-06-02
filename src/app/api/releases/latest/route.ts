import { NextResponse } from "next/server";
import { fetchLatestRelease } from "@/lib/releases";
import type { ReleaseAsset } from "@/lib/releases";

export const dynamic = "force-dynamic";

function publicAsset(asset?: ReleaseAsset) {
  if (!asset) return null;
  return {
    label: asset.label,
    size: asset.size
  };
}

export async function GET() {
  const release = await fetchLatestRelease();
  if (!release) {
    return NextResponse.json({ error: "No release found" }, { status: 404 });
  }

  return NextResponse.json({
    version: release.version,
    name: release.name,
    publishedAt: release.publishedAt,
    releaseUrl: release.releaseUrl,
    windows: {
      msi: publicAsset(release.windows.msi),
      exe: publicAsset(release.windows.exe)
    },
    linux: {
      appimage: publicAsset(release.linux.appimage),
      deb: publicAsset(release.linux.deb),
      rpm: publicAsset(release.linux.rpm)
    },
    macos: {
      dmg: publicAsset(release.macos.dmg)
    }
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
