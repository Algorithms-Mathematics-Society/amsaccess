import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function GET(_req: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  const res = await callAmsApi("GET", `/submissions/${uid}`, null, subject);
  if (!res.ok) {
    return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
