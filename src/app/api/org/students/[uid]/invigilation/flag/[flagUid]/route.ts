/**
 * The frame captured when a flag was raised.
 *
 * Proxied rather than redirected, for the same reason the photo strip is: a
 * link to a candidate's camera frame should not outlive the page it was
 * opened on.
 */

import { NextResponse } from "next/server";
import { requireSubject } from "@/lib/server/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string; flagUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const secret = process.env.AMS_INTERNAL_API_SECRET ?? "";
  if (!secret) {
    return NextResponse.json(
      { error: "AMS_INTERNAL_API_SECRET is not configured." },
      { status: 500 },
    );
  }

  const { uid, flagUid } = await params;
  const base = process.env.AMS_API_URL ?? "http://127.0.0.1:8080";
  const path =
    `/students/${encodeURIComponent(uid)}/invigilation` +
    `/flag/${encodeURIComponent(flagUid)}`;

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
    // 404 is ordinary: a flag raised before frames were attached carries no
    // image, and the list already says so with has_image.
    return NextResponse.json(
      { error: upstream.status === 404 ? "No image for this flag." : "Cannot load image." },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
