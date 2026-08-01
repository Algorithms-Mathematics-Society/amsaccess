import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;

  let body: { problem_version_uid?: string; label?: string; score?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.problem_version_uid) {
    return NextResponse.json({ error: "Pick a problem version." }, { status: 400 });
  }
  const label = (body.label ?? "").trim().toUpperCase();
  if (!label) return NextResponse.json({ error: "Give the problem a label." }, { status: 400 });

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/problems`,
    {
      problem_version_uid: body.problem_version_uid,
      label,
      score: Number(body.score ?? 100),
    },
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
