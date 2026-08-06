import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** `?verdict=SE` and `?problem_label=B` narrow it — re-running a whole
 *  contest to fix one problem disturbs results that were already right. */
export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  const verdict = params.get("verdict");
  const label = params.get("problem_label");
  if (verdict) query.set("verdict", verdict);
  if (label) query.set("problem_label", label);

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/rejudge${query.size ? `?${query}` : ""}`,
    {},
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
