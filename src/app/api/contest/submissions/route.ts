import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function GET(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const contestUid = new URL(request.url).searchParams.get("contest_uid");
  const path = contestUid ? `/submissions?contest_uid=${contestUid}` : "/submissions";
  const res = await callAmsApi("GET", path, null, subject);
  if (!res.ok) {
    return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
