import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Expire rather than delete: an expired cookie overwrites the old value in
  // the browser, where a delete can be ignored if the path does not match.
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
