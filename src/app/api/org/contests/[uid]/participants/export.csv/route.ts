import { NextResponse } from "next/server";
import { requireSubject } from "@/lib/server/session";

/** Stream the roster CSV through from ams-api.
 *
 * Not `callAmsApi`: that parses JSON, and this is a file the browser should
 * download. A static segment so it wins over `[loginId]`.
 *
 * Passwords are not in here and cannot be — only hashes are stored.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const secret = process.env.AMS_INTERNAL_API_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Server is not configured." }, { status: 503 });
  }

  const base = process.env.AMS_API_URL ?? "http://127.0.0.1:8080";
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/contests/${uid}/participants/export.csv`, {
      headers: { Authorization: `Bearer ${secret}`, "X-Auth-Subject": subject },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Cannot reach the API." }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Could not export the roster." }, { status: upstream.status });
  }

  return new NextResponse(await upstream.text(), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="roster.csv"',
      "Cache-Control": "no-store",
    },
  });
}
