import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { isValidAmsAdminCredential, setAmsAdminSession } from "@/lib/server/amsAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = checkRequestRateLimit(request, "auth", ["amsadmin-login"]);
  if (limited.limited) return apiRateLimited(limited.retryAfter);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError("Invalid request body.", 400, "BAD_REQUEST");
  }
  const record = payload as Record<string, unknown>;
  const user = typeof record.user === "string" ? record.user : "";
  const pass = typeof record.password === "string" ? record.password : "";
  if (!isValidAmsAdminCredential(user, pass)) {
    return apiError("Invalid credentials.", 401, "UNAUTHORIZED");
  }
  await setAmsAdminSession();
  return apiOk({ authenticated: true });
}
