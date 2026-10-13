import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";
import { allowedQuery } from "@/lib/server/studentFilters";

/**
 * The directory as currently filtered, in full.
 *
 * The table on screen is a page, because a browser cannot usefully render
 * several thousand rows. "I need all of them" is answered with a file, and
 * it takes the same filters so what downloads is what was on screen.
 */
export async function GET(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const res = await callAmsApi<string>(
    "GET",
    `/students/export.csv?${allowedQuery(request)}`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });

  return new NextResponse(typeof res.data === "string" ? res.data : "", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="participants.csv"',
      "Cache-Control": "no-store",
    },
  });
}
