import { NextResponse } from "next/server";
import { signUp, AuthError } from "@/lib/server/cognito";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; display_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  // Cognito enforces the real policy; this only avoids a round trip for the
  // most common mistake.
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const { confirmed } = await signUp(email, password, (body.display_name ?? "").trim());
    return NextResponse.json({ confirmed, email }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not create the account." }, { status: 502 });
  }
}
