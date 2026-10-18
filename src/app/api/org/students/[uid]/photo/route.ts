import { NextResponse } from "next/server";
import { requireSubject } from "@/lib/server/session";

/**
 * A student's face, streamed through from ams-api.
 *
 * Its own route rather than the shared helper because `callAmsApi` decodes
 * any non-JSON body with `res.text()`, which turns a JPEG into mojibake.
 *
 * A proxy rather than a redirect to object storage, for the same reason the
 * invigilation one is: these are photographs of identifiable students, and a
 * presigned URL can be forwarded and outlives the account it came from.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const secret = process.env.AMS_INTERNAL_API_SECRET ?? "";
  if (!secret)
    return NextResponse.json(
      { error: "AMS_INTERNAL_API_SECRET is not configured." },
      { status: 503 },
    );

  const { uid } = await ctx.params;
  const base = process.env.AMS_API_URL ?? "http://127.0.0.1:8080";

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/students/${encodeURIComponent(uid)}/photo`, {
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
    // 404 is ordinary: a student who has not sat a contest since identity
    // photos existed simply has no picture, and the card says so.
    return NextResponse.json(
      { error: upstream.status === 404 ? "No photo." : "Cannot load photo." },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=300",
    },
  });
}
