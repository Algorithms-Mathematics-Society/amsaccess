import type { NextRequest } from "next/server";
import { apiError, apiRateLimited } from "@/lib/server/http";
import { logger, withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/server/request";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  return withApiLogging("contact.submit", async () => {
    const limited = checkRequestRateLimit(request, "contact");
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const name = cleanText(record.name, 120);
    const email = normalizeEmail(cleanText(record.email, 180));
    const topic = cleanText(record.topic, 120);
    const message = cleanText(record.message, 4000);

    if (!name || !isValidEmail(email) || !message) {
      return apiError("Name, email, and message are required.", 400, "BAD_REQUEST");
    }

    logger.info("contact_form_validated", {
      email,
      topic: topic || "unspecified",
      messageLength: message.length
    });

    return apiError("Contact delivery is not configured yet. Please use the published support channel.", 503, "SERVER_ERROR");
  });
}
