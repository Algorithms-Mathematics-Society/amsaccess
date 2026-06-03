import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/server/request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = checkRequestRateLimit(request, "waitlist", ["beta"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError("Invalid request body.", 400, "BAD_REQUEST");
  }

  const record = payload as Record<string, unknown>;
  const email = normalizeEmail(typeof record.email === "string" ? record.email : "");

  if (!isValidEmail(email)) {
    return apiError("Enter a valid email address.", 400, "BAD_REQUEST");
  }

  console.info("beta_waitlist_joined");
  return apiOk({ joined: true });
}
