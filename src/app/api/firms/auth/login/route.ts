import { NextResponse } from "next/server";
import { signIn, AuthError } from "@/lib/server/cognito";
import { firmUserForSubject } from "@/lib/server/firmsAuth";
import { mintSessionValue, sessionCookieOptions, SESSION_COOKIE } from "@/lib/server/session";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  try {
    const claims = await signIn(email, password);
    const access = await firmUserForSubject(claims.subject);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const response = NextResponse.json({ user: access.user });
    response.cookies.set(SESSION_COOKIE, mintSessionValue(claims.subject), sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not sign you in." }, { status: 502 });
  }
}
