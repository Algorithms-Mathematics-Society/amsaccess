/** One draft: read, save, discard. */
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

type Params = { params: Promise<{ uid: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { uid } = await params;
  return proxy("GET", `/problem-drafts/${encodeURIComponent(uid)}`);
}

export async function PATCH(request: Request, { params }: Params) {
  const { uid } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return proxy("PATCH", `/problem-drafts/${encodeURIComponent(uid)}`, body);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { uid } = await params;
  return proxy("DELETE", `/problem-drafts/${encodeURIComponent(uid)}`);
}
