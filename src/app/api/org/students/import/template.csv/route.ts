import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/**
 * A header-only CSV of the columns an import accepts.
 *
 * ams-api describes the template as JSON; only the column names go in the
 * file, so filling it in never imports the API's example student by mistake.
 */
export async function GET() {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const res = await callAmsApi<{ columns?: unknown }>(
    "GET",
    "/students/import/template.csv",
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  const columns = res.data?.columns;
  if (!Array.isArray(columns) || !columns.every((c) => typeof c === "string")) {
    return NextResponse.json({ error: "The import template was not recognised." }, { status: 502 });
  }

  return new NextResponse(`${columns.join(",")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
