/** Turn a verified draft into a real problem. */
import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

type Params = { params: Promise<{ uid: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { uid } = await params;
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const res = await callAmsApi(
    "POST",
    `/problem-drafts/${encodeURIComponent(uid)}/publish`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: res.status });
}
