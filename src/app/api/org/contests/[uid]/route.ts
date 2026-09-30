import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const res = await callAmsApi("GET", `/contests/${uid}`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

/** Move the contest window. Any field omitted is left as it was. */
export async function PATCH(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;

  let body: { starts_at?: string; ends_at?: string; freeze_minutes_before_end?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.starts_at && body.ends_at && new Date(body.ends_at) <= new Date(body.starts_at)) {
    return NextResponse.json({ error: "The contest must end after it starts." }, { status: 400 });
  }

  const res = await callAmsApi("PATCH", `/contests/${uid}`, body, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

/**
 * Delete a contest.
 *
 * `?purge=1` is forwarded only once the caller has confirmed it. Without it
 * the API refuses any contest that has submissions, which is the behaviour we
 * want by default: deleting cascades to everyone's results and there is no
 * undo.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const purge = new URL(request.url).searchParams.get("purge") === "1";
  const path = `/contests/${uid}${purge ? "?purge=true" : ""}`;

  const res = await callAmsApi("DELETE", path, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return new NextResponse(null, { status: 204 });
}
