import { NextResponse } from "next/server";
import { uploadToAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function POST(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a CSV upload." }, { status: 400 });
  }
  if (!(form.get("file") instanceof File)) {
    return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
  }

  const res = await uploadToAmsApi("/students/import", form, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
