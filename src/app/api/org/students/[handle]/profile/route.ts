import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** One participant's whole record, in a single call. */
export async function GET(_request: Request, ctx: { params: Promise<{ handle: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { handle } = await ctx.params;
  const res = await callAmsApi(
    "GET",
    `/students/${encodeURIComponent(handle)}/profile`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
