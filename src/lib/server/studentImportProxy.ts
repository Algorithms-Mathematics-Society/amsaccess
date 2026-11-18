import { NextResponse } from "next/server";
import { errorMessage, uploadToAmsApi } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";
import { MAX_STUDENT_IMPORT_BYTES } from "@/lib/studentImport";

export async function studentImportProxy(
  request: Request,
  action: "preview" | "commit",
) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a CSV upload." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
  if (file.size > MAX_STUDENT_IMPORT_BYTES)
    return NextResponse.json(
      { error: "The CSV must be 10 MiB or smaller." },
      { status: 413 },
    );
  if (
    typeof form.get("mapping") !== "string" ||
    (action === "commit" && typeof form.get("preview_token") !== "string")
  )
    return NextResponse.json(
      { error: "Preview the mapped file before importing." },
      { status: 400 },
    );
  const result = await uploadToAmsApi(
    `/students/import/${action}`,
    form,
    subject,
  );
  if (!result.ok)
    return NextResponse.json(
      {
        error:
          result.status === 404
            ? "Student import preview is not available on the API yet. Ask an administrator to update it before importing."
            : errorMessage(result.data),
      },
      { status: result.status },
    );
  return NextResponse.json(result.data);
}
