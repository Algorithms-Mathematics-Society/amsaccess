import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/server/http";
import { isValidEmail, normalizeEmail } from "@/lib/server/request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  console.info("beta_waitlist_joined", { email });
  return apiOk({ joined: true });
}
