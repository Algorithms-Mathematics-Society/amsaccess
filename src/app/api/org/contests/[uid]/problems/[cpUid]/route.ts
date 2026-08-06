import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ uid: string; cpUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { uid, cpUid } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const res = await callAmsApi("PATCH", `/contests/${uid}/problems/${cpUid}`, body, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function DELETE(
  _r: Request,
  ctx: { params: Promise<{ uid: string; cpUid: string }> },
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { uid, cpUid } = await ctx.params;
  const res = await callAmsApi("DELETE", `/contests/${uid}/problems/${cpUid}`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
