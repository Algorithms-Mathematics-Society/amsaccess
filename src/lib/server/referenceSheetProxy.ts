import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";
import { validateReferenceSheetRequest } from "@/lib/referenceSheet";

export async function referenceSheetProxy(
  request: Request,
  uid: string,
  method: "GET" | "PUT" | "POST",
) {
  const subject = await requireSubject();
  if (!subject)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  let body: Record<string, unknown> | null = null;
  if (method !== "GET") {
    const origin = request.headers.get("origin");
    if (
      (origin && origin !== new URL(request.url).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return NextResponse.json(
        { error: "Use the organizer website to update this sheet." },
        { status: 403 },
      );
    }
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return NextResponse.json(
        { error: "A JSON request is required." },
        { status: 415 },
      );
    }
    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }
    const error = validateReferenceSheetRequest(value, method === "POST");
    if (error) return NextResponse.json({ error }, { status: 400 });
    const input = value as Record<string, unknown>;
    body =
      method === "POST"
        ? { version: input.version }
        : { title: input.title, body: input.body, version: input.version };
  }
  const suffix = method === "POST" ? "/publish" : "";
  // Staff and contest ownership are checked by the API with the signed session's subject.
  const result = await callAmsApi(
    method,
    `/contests/${encodeURIComponent(uid)}/reference-sheet${suffix}`,
    body,
    subject,
  );
  return NextResponse.json(
    result.ok ? result.data : { error: errorMessage(result.data) },
    {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
