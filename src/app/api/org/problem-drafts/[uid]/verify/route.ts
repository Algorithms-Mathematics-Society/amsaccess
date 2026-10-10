/**
 * Verification: POST starts a run, GET polls it.
 *
 * Two verbs on one path because they are two halves of one thing, and a
 * separate /verify-status would be a second name for the same question.
 */
import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

async function proxy(method: string, path: string) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const res = await callAmsApi(method, path, null, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  return NextResponse.json(res.data, { status: res.status });
}

type Params = { params: Promise<{ uid: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { uid } = await params;
  return proxy("POST", `/problem-drafts/${encodeURIComponent(uid)}/verify`);
}

export async function GET(_request: Request, { params }: Params) {
  const { uid } = await params;
  return proxy("GET", `/problem-drafts/${encodeURIComponent(uid)}/verify`);
}
