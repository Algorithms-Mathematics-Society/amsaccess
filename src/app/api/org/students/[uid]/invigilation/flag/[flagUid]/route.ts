/**
 * The frame captured when a flag was raised.
 *
 * Proxied, not redirected: a link to a candidate's camera frame should not
 * outlive the page it was opened on, which is the same reason the photo
 * strip is proxied.
 */

import { NextResponse } from "next/server";
import { callAmsApiRaw } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string; flagUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid, flagUid } = await params;
  const res = await callAmsApiRaw(
    "GET",
    `/students/${encodeURIComponent(uid)}/invigilation/flag/${encodeURIComponent(flagUid)}`,
    subject,
  );
  if (!res.ok) return new NextResponse(null, { status: res.status });

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
