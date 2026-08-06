import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** Register an existing student for a contest. Returns their credential once. */
export async function POST(
  _r: Request,
  ctx: { params: Promise<{ uid: string; contestUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid, contestUid } = await ctx.params;
  const res = await callAmsApi("POST", `/students/${uid}/contests/${contestUid}`, {}, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
