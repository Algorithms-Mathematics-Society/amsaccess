import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function GET() {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const res = await callAmsApi("GET", "/auth/me", null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data);
}
