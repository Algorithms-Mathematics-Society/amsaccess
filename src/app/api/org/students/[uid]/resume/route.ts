import { NextResponse } from "next/server";
import { callAmsApi, uploadToAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

const MAX_RESUME_BYTES = 8 * 1024 * 1024;

/** A short-lived download link for the stored PDF. */
export async function GET(_r: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { uid } = await ctx.params;
  const res = await callAmsApi("GET", `/students/${uid}/resume`, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("resume");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF." }, { status: 400 });
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: "Resume is larger than 8 MB." }, { status: 413 });
  }

  const res = await uploadToAmsApi(`/students/${uid}/resume`, form, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
