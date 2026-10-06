import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** Look a roster of addresses up in the directory. Commits to nothing. */
export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;

  let body: { emails?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const emails = (body.emails ?? []).filter(Boolean);
  if (emails.length === 0) {
    return NextResponse.json({ error: "The file had no rows." }, { status: 400 });
  }

  const res = await callAmsApi(
    "POST",
    `/contests/${uid}/participants/resolve`,
    { emails },
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
