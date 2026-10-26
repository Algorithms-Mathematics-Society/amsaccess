import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** Every announcement for this contest, and how far each one reached. */
export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const res = await callAmsApi("GET", `/contests/${uid}/announcements`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

/** Issue one. Published the moment the backend accepts it, and never recalled. */
export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const res = await callAmsApi("POST", `/contests/${uid}/announcements`, body, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
