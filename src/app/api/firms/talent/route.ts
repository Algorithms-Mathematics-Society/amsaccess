import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireFirmUser } from "@/lib/server/firmsAuth";

const ALLOWED = ["q", "college", "branch", "graduation_year", "contest_uid", "tag", "min_solved", "sort", "limit", "offset"];

export async function GET(request: Request) {
  const access = await requireFirmUser();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const incoming = new URL(request.url).searchParams;
  const outgoing = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = incoming.get(key);
    if (value) outgoing.set(key, value);
  }
  const result = await callAmsApi("GET", `/talent/candidates?${outgoing}`, null, access.subject);
  if (!result.ok) return NextResponse.json({ error: errorMessage(result.data) }, { status: result.status });
  return NextResponse.json(result.data);
}
