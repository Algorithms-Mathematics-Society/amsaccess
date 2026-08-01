/** Who is making this request.
 *
 * The session cookie holds a Cognito `sub`, **signed** with an HMAC. The
 * previous version stored the subject in plain text, which meant anyone who
 * could set a cookie could name themselves any user — including staff. The
 * API trusts `X-Auth-Subject` on the strength of this check, so it has to be
 * a real one.
 *
 * Signing rather than encrypting: the subject is not a secret, it just must
 * not be forgeable.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "ams_session";

// Long enough that a contestant is not signed out mid-contest.
const MAX_AGE_SECONDS = 12 * 60 * 60;

export type Session = { subject: string; source: "cookie" | "dev" };

function signingKey(): string {
  // Reuses the internal API secret: both are server-side shared secrets with
  // the same blast radius, and one fewer secret to rotate is one fewer to
  // forget. Rotating it invalidates live sessions, which is acceptable.
  return process.env.AMS_SESSION_SECRET ?? process.env.AMS_INTERNAL_API_SECRET ?? "";
}

function sign(value: string): string {
  return createHmac("sha256", signingKey()).update(value).digest("base64url");
}

/** `<subject>.<expiry>.<signature>` */
export function mintSessionValue(subject: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${subject}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionValue(raw: string): string | null {
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [subject, expiry, signature] = parts;

  const expected = sign(`${subject}.${expiry}`);
  // Constant-time: a timing oracle on the signature is the whole attack.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  // The expiry lives inside the signed payload, so it cannot be extended by
  // editing the cookie — unlike the cookie's own Max-Age, which the browser
  // owns and an attacker can simply ignore.
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() / 1000) return null;

  return subject || null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();

  const signed = store.get(SESSION_COOKIE)?.value;
  if (signed) {
    const subject = readSessionValue(signed);
    if (subject) return { subject, source: "cookie" };
  }

  // Local development against seeded users. Guarded twice on purpose: this
  // bypasses authentication entirely, so it must be impossible to leave on
  // by accident in a production build.
  if (process.env.NODE_ENV !== "production" && process.env.AMS_DEV_SUBJECT) {
    return { subject: process.env.AMS_DEV_SUBJECT, source: "dev" };
  }
  return null;
}

export async function requireSubject(): Promise<string | null> {
  return (await getSession())?.subject ?? null;
}
