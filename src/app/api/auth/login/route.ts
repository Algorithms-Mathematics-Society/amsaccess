import { NextResponse } from "next/server";
import { signIn, AuthError } from "@/lib/server/cognito";
import { callAmsApi, errorMessage } from "@/lib/server/amsApi";
import { mintSessionValue, sessionCookieOptions, SESSION_COOKIE } from "@/lib/server/session";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  let claims;
  try {
    claims = await signIn(email, password);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not sign you in." }, { status: 502 });
  }

  // Create-or-update the user only *after* the token is verified, and behind
  // the internal secret — so a user row can never be conjured by a request
  // that has not proved an identity.
  const synced = await callAmsApi(
    "POST",
    "/auth/sync",
    { subject: claims.subject, email: claims.email, display_name: claims.displayName },
    null,
  );
  if (!synced.ok) {
    return NextResponse.json({ error: errorMessage(synced.data) }, { status: synced.status });
  }

  const res = NextResponse.json({ user: synced.data });
  res.cookies.set(SESSION_COOKIE, mintSessionValue(claims.subject), sessionCookieOptions());
  return res;
}
