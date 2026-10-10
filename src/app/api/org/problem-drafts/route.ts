/**
 * Drafts: list and create. The editor's index page.
 *
 * Thin by design, like the mail console: every screen maps to one ams-api
 * route and the only thing this side adds is the session to subject step.
 */
import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

async function proxy(method: string, path: string, body: Record<string, unknown> | null = null) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const res = await callAmsApi(method, path, body, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(res.data, { status: res.status });
}

export async function GET() {
  return proxy("GET", "/problem-drafts");
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return proxy("POST", "/problem-drafts", body);
}
