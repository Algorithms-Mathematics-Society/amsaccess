import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

// One provisioning call per contest is normal; 2000 is the API's own cap.
const MAX_PER_BATCH = 2000;

export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const res = await callAmsApi("GET", `/contests/${uid}/participants`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

// POST creates people *on* the contest, which is the one case the directory
// route cannot serve: a rehearsal needs candidates who do not exist and must
// not. For a real round, adding people still goes through
// `participants/resolve` then `participants/from-directory`, because that is
// where a person's college, reference and resume live and a contest-made
// record would be a second, emptier one.
//
// The API refuses an intern on anything but a practice contest, and refuses
// everyone the directory routes on a practice contest, so this is the only
// door an intern has and it leads nowhere near a real candidate.
export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${encodeURIComponent(uid)}/participants`,
    body,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
