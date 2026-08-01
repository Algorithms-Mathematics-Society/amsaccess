import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** Every submission in the contest — the setter's live view of judging. */
export async function GET(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const limit = new URL(request.url).searchParams.get("limit") ?? "100";

  const res = await callAmsApi(
    "GET",
    `/contests/${encodeURIComponent(uid)}/submissions?limit=${encodeURIComponent(limit)}`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
