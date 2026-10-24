import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const body = (await request.json()) as { source_contest_uid?: string };
  if (!body?.source_contest_uid) {
    return NextResponse.json(
      { error: "Choose a contest to copy from." },
      { status: 400 },
    );
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/participants/from-contest`,
    { source_contest_uid: body.source_contest_uid },
    subject,
  );
  if (!res.ok)
    return NextResponse.json(
      { error: errorMessage(res.data) },
      { status: res.status },
    );
  return NextResponse.json(res.data);
}
