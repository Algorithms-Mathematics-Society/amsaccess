import { NextResponse } from "next/server";
import { uploadToAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** Dry-run a package. Stores nothing — this is what the upload form previews. */
export async function POST(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }
  if (!(form.get("package") instanceof File)) {
    return NextResponse.json({ error: "Choose a .cxxpkg file." }, { status: 400 });
  }

  const res = await uploadToAmsApi("/problems/inspect", form, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
