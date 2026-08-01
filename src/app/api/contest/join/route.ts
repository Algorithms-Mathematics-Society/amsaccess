import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function POST(request: Request) {
  const subject = await requireSubject();
  if (!subject) {
    return NextResponse.json({ error: "Sign in to join a contest." }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "Enter a contest code." }, { status: 400 });
  }

  const res = await callAmsApi("POST", "/contests/join", { code }, subject);
  if (!res.ok) {
    return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  }
  return NextResponse.json(res.data);
}
