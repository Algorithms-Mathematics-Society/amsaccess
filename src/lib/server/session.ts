/** Who is making this request.
 *
 * Firebase session cookies are still the live mechanism; Cognito is
 * provisioned but not yet cut over. Everything downstream depends only on
 * `subject`, so the swap is confined to this file.
 */

import { cookies } from "next/headers";

export type Session = { subject: string; source: "cookie" | "dev" };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const subject = store.get("ams_subject")?.value;
  if (subject) return { subject, source: "cookie" };

  // Local development against seeded users, never in production.
  if (process.env.NODE_ENV !== "production" && process.env.AMS_DEV_SUBJECT) {
    return { subject: process.env.AMS_DEV_SUBJECT, source: "dev" };
  }
  return null;
}

export async function requireSubject(): Promise<string | null> {
  return (await getSession())?.subject ?? null;
}
