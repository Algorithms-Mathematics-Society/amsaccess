import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** Rebuild one version's candidate projection from its stored pack. Judging is untouched. */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ uid: string; versionUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid, versionUid } = await ctx.params;
  const res = await callAmsApi(
    "POST",
    `/problems/${uid}/versions/${versionUid}/reproject`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
