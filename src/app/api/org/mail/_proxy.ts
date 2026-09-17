/**
 * The mail console is a thin pass-through: every screen maps to one ams-api
 * route, and the only thing this side adds is the session → subject step.
 * One helper so the five route files below do not each repeat it.
 */

import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

export async function proxy(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body: Record<string, unknown> | null = null,
  okStatus?: number,
) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const res = await callAmsApi(method, path, body, subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(res.data, { status: okStatus ?? res.status });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
