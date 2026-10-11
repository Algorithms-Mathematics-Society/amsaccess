import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/**
 * Counts over the whole contest, not over the page the table shows.
 *
 * The listing is capped — most recent 200 — and the console used to count
 * that array for the tab badge and tally the verdict pills from it. At a
 * thousand submissions it read "200" and "AC 63", which are facts about the
 * fetch and not about the contest.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const res = await callAmsApi(
    "GET",
    `/contests/${encodeURIComponent(uid)}/submissions/summary`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
