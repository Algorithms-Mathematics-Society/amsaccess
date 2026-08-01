import { NextResponse } from "next/server";
import { uploadToAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

// Generous, but refuses an accidental video. ams-api enforces the real limit.
const MAX_PACKAGE_BYTES = 64 * 1024 * 1024;

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

  const file = form.get("package");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a .cxxpkg file." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_PACKAGE_BYTES) {
    return NextResponse.json({ error: "Package is larger than 64 MB." }, { status: 413 });
  }

  const res = await uploadToAmsApi(`/problems/${uid}/versions`, form, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
