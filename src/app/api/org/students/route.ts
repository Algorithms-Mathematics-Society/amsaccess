import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";
import { allowedQuery } from "@/lib/server/studentFilters";


export async function GET(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  // Every filter the directory offers, forwarded as given. The proxy used
  // to forward `q` alone and pin the limit at 500, which is how a directory
  // of 2,500 came to report itself as 500.
  const res = await callAmsApi(
    "GET",
    `/students?${allowedQuery(request)}`,
    null,
    subject,
  );
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}

export async function POST(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!String(body.display_name ?? "").trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  const res = await callAmsApi("POST", "/students", body, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: 201 });
}
