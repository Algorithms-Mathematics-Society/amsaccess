import { NextResponse } from "next/server";
import { fetchLatestRelease } from "@/lib/releases";

export const dynamic = "force-dynamic";

export async function GET() {
  const release = await fetchLatestRelease();
  if (!release) {
    return NextResponse.json({ error: "No release found" }, { status: 404 });
  }
  return NextResponse.json(release, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
