import { NextResponse } from "next/server";
import { confirmSignUp, resendCode, AuthError } from "@/lib/server/cognito";

export async function POST(request: Request) {
  let body: { email?: string; code?: string; resend?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Enter your email." }, { status: 400 });

  try {
    if (body.resend) {
      await resendCode(email);
      return NextResponse.json({ sent: true });
    }
    const code = (body.code ?? "").trim();
    if (!code) return NextResponse.json({ error: "Enter the code we emailed." }, { status: 400 });
    await confirmSignUp(email, code);
    return NextResponse.json({ confirmed: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not confirm the account." }, { status: 502 });
  }
}
