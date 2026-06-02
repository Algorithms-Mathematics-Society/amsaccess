import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchLatestRelease } from "@/lib/releases";
import type { ReleaseAsset } from "@/lib/releases";
import { requireOrgUser } from "@/lib/server/auth";
import { apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";

type Platform = "windows" | "linux" | "macos";
type AssetType = "msi" | "exe" | "appimage" | "deb" | "rpm" | "dmg";

const allowedAssets: Record<Platform, AssetType[]> = {
  windows: ["msi", "exe"],
  linux: ["appimage", "deb", "rpm"],
  macos: ["dmg"],
};

function isPlatform(value: string | null): value is Platform {
  return value === "windows" || value === "linux" || value === "macos";
}

function isAssetType(value: string | null): value is AssetType {
  return value === "msi" || value === "exe" || value === "appimage" || value === "deb" || value === "rpm" || value === "dmg";
}

export async function GET(request: NextRequest) {
  const auth = await requireOrgUser();
  if (auth.error || !auth.uid) {
    const loginUrl = new URL("/org/login", request.url);
    loginUrl.searchParams.set("next", "/download");
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const platform = request.nextUrl.searchParams.get("platform");
  const type = request.nextUrl.searchParams.get("type");

  if (!isPlatform(platform) || !isAssetType(type) || !allowedAssets[platform].includes(type)) {
    return NextResponse.json({ error: "Unknown download asset." }, { status: 404 });
  }

  const limited = checkRequestRateLimit(request, "privateRead", ["release-download", platform, type]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);

  const release = await fetchLatestRelease();
  let asset: ReleaseAsset | undefined;

  if (platform === "windows") {
    asset = type === "msi" ? release?.windows.msi : release?.windows.exe;
  } else if (platform === "linux") {
    if (type === "appimage") asset = release?.linux.appimage;
    if (type === "deb") asset = release?.linux.deb;
    if (type === "rpm") asset = release?.linux.rpm;
  } else if (type === "dmg") {
    asset = release?.macos.dmg;
  }

  if (!asset?.url) {
    return NextResponse.json({ error: "Download asset is not available." }, { status: 404 });
  }

  const response = NextResponse.redirect(asset.url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
