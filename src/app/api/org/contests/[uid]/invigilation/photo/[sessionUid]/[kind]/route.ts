import { NextResponse } from "next/server";
import { requireSubject } from "@/lib/server/session";

/**
 * One candidate's entry or exit photograph, streamed through from ams-api.
 *
 * Its own route rather than the usual `_proxy` helper because `callAmsApi`
 * decodes any non-JSON response with `res.text()`, which turns a JPEG into
 * mojibake. This passes the bytes along untouched.
 *
 * It stays a proxy rather than a redirect to object storage on purpose:
 * these are photographs of identifiable people, nearly all of them students,
 * and a presigned URL is a URL that can be forwarded, pasted into a chat, or
 * live on in someone's history after their account is closed. Behind this
 * route, access ends when the org session does.
 */
const KINDS = new Set(["entry", "exit"]);

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ uid: string; sessionUid: string; kind: string }> },
) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid, sessionUid, kind } = await ctx.params;
  if (!KINDS.has(kind))
    return NextResponse.json({ error: "Unknown photo." }, { status: 404 });

  const secret = process.env.AMS_INTERNAL_API_SECRET ?? "";
  if (!secret)
    return NextResponse.json(
      { error: "AMS_INTERNAL_API_SECRET is not configured." },
      { status: 503 },
    );

  const base = process.env.AMS_API_URL ?? "http://127.0.0.1:8080";
  const path =
    `/contests/${encodeURIComponent(uid)}/invigilation` +
    `/sessions/${encodeURIComponent(sessionUid)}/photo/${encodeURIComponent(kind)}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${base}${path}`, {
      headers: {
        Authorization: `Bearer ${secret}`,
        "X-Auth-Subject": subject,
        "X-Request-ID": crypto.randomUUID(),
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Cannot reach the API." }, { status: 502 });
  }

  if (!upstream.ok) {
    // 404 is the ordinary case, not an error: most sessions that ran before
    // this feature existed have no photo, and the roster already says so.
    return NextResponse.json(
      { error: upstream.status === 404 ? "No photo for this session." : "Cannot load photo." },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Content-Length": String(body.byteLength),
      // Private and short. A frame never changes, but a photograph of a
      // person sitting in a shared invigilation laptop's disk cache is not
      // worth the round trip it saves.
      "Cache-Control": "private, max-age=300",
    },
  });
}
