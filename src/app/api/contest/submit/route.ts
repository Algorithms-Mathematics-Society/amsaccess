import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

// A generous ceiling that still refuses a pasted binary. cxxprobe's own
// limits are what actually govern judging.
const MAX_SOURCE_BYTES = 256_000;

export async function POST(request: Request) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { contest_uid?: string; problem_label?: string; language?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const source = body.source ?? "";
  if (!source.trim()) {
    return NextResponse.json({ error: "Write some code before submitting." }, { status: 400 });
  }
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) {
    return NextResponse.json({ error: "Source is too large." }, { status: 413 });
  }
  if (!body.contest_uid || !body.problem_label) {
    return NextResponse.json({ error: "Missing contest or problem." }, { status: 400 });
  }

  const res = await callAmsApi(
    "POST",
    "/submissions",
    {
      contest_uid: body.contest_uid,
      problem_label: body.problem_label,
      language: body.language ?? "cpp",
      source,
    },
    subject,
  );
  if (!res.ok) {
    return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  }
  return NextResponse.json(res.data, { status: 202 });
}
