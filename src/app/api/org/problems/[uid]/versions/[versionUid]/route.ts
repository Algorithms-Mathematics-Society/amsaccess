import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function DELETE(
  _r: Request,
  ctx: { params: Promise<{ uid: string; versionUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { uid, versionUid } = await ctx.params;
  const res = await callAmsApi("DELETE", `/problems/${uid}/versions/${versionUid}`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return new NextResponse(null, { status: 204 });
}
