import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** Add people already in the Access directory to this contest, by uid. */
export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;

  let body: { student_uids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const student_uids = (body.student_uids ?? []).filter(Boolean);
  if (student_uids.length === 0) {
    return NextResponse.json({ error: "Select at least one person." }, { status: 400 });
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/participants/from-directory`,
    { student_uids },
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });

  // Passwords are in here for anyone newly given one. Same contract as the
  // roster route: this response is the only time they exist.
  return NextResponse.json(res.data, { status: 201 });
}
