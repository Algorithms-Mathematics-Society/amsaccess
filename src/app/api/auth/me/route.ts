import { NextResponse } from "next/server";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { getSession } from "@/lib/server/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const res = await callAmsApi("GET", "/auth/me", null, session.subject);
  if (!res.ok) return NextResponse.json({ error: errorMessage(res.data) }, { status: res.status });
  // The cookie is httpOnly, so this is how the console learns when to warn.
  // Only the signed expiry is added; the cookie value itself never leaves.
  return NextResponse.json({ ...(res.data as object), session_expires_at: session.expiresAt ?? null });
}
