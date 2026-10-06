import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** One participant's whole record, in a single call. */
export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  // The segment is named `uid` because a sibling route already is, and Next
  // requires one slug name per path position — two names for the same segment
  // crashes the server at runtime, after a build that passes. The API accepts
  // a handle or a uuid here, so either value works.
  const { uid } = await ctx.params;
  const res = await callAmsApi(
    "GET",
    `/students/${encodeURIComponent(uid)}/profile`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
