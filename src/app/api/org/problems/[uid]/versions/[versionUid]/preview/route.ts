import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** The candidate-facing projection for one version, for staff to read.
 *
 *  Carries no tests, checker or reference solution -- the projection is by
 *  construction the subset a candidate is shown. */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ uid: string; versionUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid, versionUid } = await ctx.params;
  const res = await callAmsApi(
    "GET",
    `/problems/${uid}/versions/${versionUid}/preview`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
