import { NextResponse } from "next/server";
import { downloadFromAmsApi } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";

/** The roster as CSV. A static segment, so it wins over `[loginId]`.
 *
 * Passwords are not in here and cannot be — only hashes are stored.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ uid: string }> }) {
  const subject = await requireSubject();
  if (!subject) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { uid } = await ctx.params;
  return downloadFromAmsApi(`/contests/${uid}/participants/export.csv`, subject, "roster.csv");
}
