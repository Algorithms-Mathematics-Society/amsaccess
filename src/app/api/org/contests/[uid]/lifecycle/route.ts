/**
 * Ending, archiving and unarchiving a contest.
 *
 * One route rather than three files because the three actions differ only in
 * the path segment they forward to, and the `action` is whitelisted here so a
 * crafted value cannot reach into the rest of the contest API.
 */

import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

const ACTIONS = new Set(["end", "archive", "unarchive"]);

export async function POST(
  request: Request,
  ctx: { params: Promise<{ uid: string }> },
) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const action = new URL(request.url).searchParams.get("action") ?? "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/${action}`,
    null,
    subject,
  );
  if (!res.ok)
    return NextResponse.json(
      { error: errorMessage(res.data) },
      { status: res.status },
    );
  return NextResponse.json(res.data);
}
