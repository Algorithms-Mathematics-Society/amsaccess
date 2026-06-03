import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/server/request";
import { createSessionCookie } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

type LoginScope = "admin" | "org";

function isLoginScope(value: unknown): value is LoginScope {
  return value === "admin" || value === "org";
}

export async function POST(request: NextRequest) {
  return withApiLogging("auth.login", async () => {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const email = normalizeEmail(typeof record.email === "string" ? record.email : "");
    const password = typeof record.password === "string" ? record.password : "";
    const scope = record.scope;

    if (!isValidEmail(email) || !password || !isLoginScope(scope)) {
      return apiError("Email and password are required.", 400, "BAD_REQUEST");
    }

    // Distributed rate limits (Upstash when configured, in-memory fallback).
    // Email is included in the key so brute-forcing a specific account is
    // throttled regardless of which IP the attacker rotates through.
    const minuteLimit = await checkRequestRateLimitAsync(request, "auth", [scope, email]);
    if (minuteLimit.limited) return apiRateLimited(minuteLimit.retryAfter);

    const hourlyLimit = await checkRequestRateLimitAsync(request, "authHourly", [scope, email]);
    if (hourlyLimit.limited) return apiRateLimited(hourlyLimit.retryAfter);

    const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY ?? "";

    if (!firebaseWebApiKey) {
      return apiError("Auth service not configured.", 500, "SERVER_ERROR");
    }

    // Explicit timeout on the upstream Firebase Identity Toolkit call.
    // Without this, a slow/hung Firebase endpoint holds the serverless slot
    // indefinitely and can exhaust all concurrent function capacity.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let firebaseRes: Response;
    try {
      firebaseRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
          signal: controller.signal,
        },
      );
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") {
        return apiError("Authentication service timed out.", 504, "SERVER_ERROR");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!firebaseRes.ok) {
      return apiError("Invalid credentials.", 401, "UNAUTHORIZED");
    }

    const firebaseData = (await firebaseRes.json()) as { idToken: string };

    let sessionCookieValue: string;
    try {
      sessionCookieValue = await createSessionCookie(firebaseData.idToken);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        const details = error instanceof Error ? error.message : String(error);
        console.error("firebase_session_cookie_failed", details);
      }
      return apiError("Unable to create session.", 500, "SERVER_ERROR");
    }

    const cookieStore = await cookies();
    cookieStore.set("ams_session", sessionCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 5 * 24 * 60 * 60,
      path: "/",
    });

    const redirectTo = scope === "admin" ? "/admin" : "/org/dashboard";
    return apiOk({ redirectTo });
  });
}
