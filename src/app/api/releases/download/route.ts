import { NextResponse, type NextRequest } from "next/server";
import { fetchRecentRelease } from "@/lib/releases";
import { parseDownloadIdentity, resolveDownload } from "@/lib/release-download";
import { apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";
const MISMATCH_RECHECK_AGE_MS = 5_000;
function downloadError(status: number, heading: string, message: string) {
  // Only fixed application strings enter this HTML, never request parameters.
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${heading} — Access</title><style>body{margin:0;background:#fafafa;color:#171717;font:16px/1.65 system-ui,sans-serif}main{max-width:560px;margin:12vh auto;padding:32px}h1{font-size:28px;line-height:1.25}p{color:#555}a{display:inline-block;margin-top:16px;padding:12px 18px;background:#171717;color:white;border-radius:6px;text-decoration:none}a:focus-visible{outline:2px solid #7c3aed;outline-offset:4px}</style></head><body><main><p>Access downloads</p><h1>${heading}</h1><p>${message}</p><a href="/download?refresh=1">Refresh downloads</a></main></body></html>`, {
    status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
export async function GET(request: NextRequest) {
  const expected = parseDownloadIdentity(request.nextUrl.searchParams);
  if (!expected) return downloadError(400, "Refresh this download link", "Open the downloads page to select a file with its current version and checksum.");
  const limited = await checkRequestRateLimitAsync(request, "releaseDownload", ["release-download"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  // Recheck metadata at most RECENT_RELEASE_TTL_MS old. A stale page must never silently select another file:
  // the redirect is only issued for an exact identity match against that snapshot.
  let release = await fetchRecentRelease();
  if (!release) return downloadError(503, "Downloads are temporarily unavailable", "We could not confirm the release information. Please try again shortly.");
  let asset = resolveDownload(release, expected);
  // A page newer than the cached snapshot (a release just published) gets one coalesced upstream recheck.
  if (!asset) {
    release = await fetchRecentRelease(MISMATCH_RECHECK_AGE_MS);
    asset = release ? resolveDownload(release, expected) : null;
  }
  if (!asset) return downloadError(409, "This download has changed", "A release or installer changed since this page was loaded. Refresh to see the current filename, version and checksum before downloading.");
  const response = NextResponse.redirect(asset.url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
