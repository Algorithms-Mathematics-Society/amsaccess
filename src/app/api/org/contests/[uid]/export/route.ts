import { NextResponse } from "next/server";
import { downloadFromAmsApi } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

const KINDS: Record<string, string> = {
  standings: "results.csv",
  submissions: "submissions.csv",
};

/** `?kind=standings|submissions` */
export async function GET(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const kind = new URL(request.url).searchParams.get("kind") ?? "standings";
  const file = KINDS[kind];
  if (!file) return NextResponse.json({ error: "Unknown export." }, { status: 400 });

  return downloadFromAmsApi(`/contests/${uid}/${file}`, subject, file);
}
