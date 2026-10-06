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

// No POST. A contest selects people from the Access directory; it does not
// author them, because that is where a person's college, reference and resume
// live and a contest-made record would be a second, emptier one. Adding people
// goes through `participants/resolve` then `participants/from-directory`.
