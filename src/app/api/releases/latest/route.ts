import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchLatestRelease } from "@/lib/releases";
import type { ReleaseAsset } from "@/lib/releases";
import { apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

function publicAsset(asset?: ReleaseAsset) {
  if (!asset) return null;
  return {
    label: asset.label,
    size: asset.size
  };
}

export async function GET(request: NextRequest) {
  // Rate-limit this public unauthenticated endpoint to prevent Vercel
  // invocation cost amplification and GitHub API rate-limit exhaustion.
  const limited = await checkRequestRateLimitAsync(request, "publicRead", ["releases-latest"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);

  const release = await fetchLatestRelease();
  if (!release) {
    return NextResponse.json({ error: "No release found" }, { status: 404 });
  }

  return NextResponse.json({
    version: release.version,
    name: release.name,
    publishedAt: release.publishedAt,
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
