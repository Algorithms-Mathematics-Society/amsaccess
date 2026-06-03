import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { logger, withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimitAsync } from "@/lib/server/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/server/request";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isCategory(value: string) {
  return value === "Sales" || value === "Support" || value === "Security";
}

function isExpectedRoundVolume(value: string) {
  return value === "Not sure yet" || value === "< 100" || value === "100-1,000" || value === "1,000+";
}

export async function POST(request: NextRequest) {
  return withApiLogging("contact.submit", async () => {
    // IP rate limit first — before JSON parsing — so bots pay minimal cost
    // and can't exhaust JSON parse budget. Upstash-backed when configured.
    const ipLimit = await checkRequestRateLimitAsync(request, "contact", ["ip"]);
    if (ipLimit.limited) return apiRateLimited(ipLimit.retryAfter);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;

    // Honeypot: bots fill hidden fields that human users never see.
    // Silently succeed so the bot doesn't know it was rejected.
    if (typeof record._hp === "string" && record._hp.length > 0) {
      return apiOk({ delivered: true });
    }

    // Extract email early so we can apply per-email rate limiting before
    // doing full validation — limits cost of high-volume address enumeration.
    const email = normalizeEmail(cleanText(record.email, 180));
    if (isValidEmail(email)) {
      const emailLimit = await checkRequestRateLimitAsync(request, "contact", ["email", email]);
      if (emailLimit.limited) return apiRateLimited(emailLimit.retryAfter);
    }

    const name = cleanText(record.name, 120);
    const organization = cleanText(record.organization, 160);
    const category = cleanText(record.category, 40);
    const expectedRoundVolume = cleanText(record.expectedRoundVolume, 40);
    const message = cleanText(record.message, 4000);

    if (!name || !isValidEmail(email) || !message || !isCategory(category) || (expectedRoundVolume && !isExpectedRoundVolume(expectedRoundVolume))) {
      return apiError("Name, email, category, and message are required.", 400, "BAD_REQUEST");
    }

    const contactPayload = {
      name,
      organization,
      email,
      category,
      expectedRoundVolume: expectedRoundVolume || "Not sure yet",
      message
    };

    if (!process.env.RESEND_API_KEY) {
      // Log metadata only — no PII (name/email/message) in stdout
      logger.info("contact_form_logged", { category, messageLength: message.length });
      return apiOk({ delivered: true });
    }

    const to = process.env.CONTACT_TO_EMAIL ?? process.env.RESEND_TO_EMAIL;
    if (!to) {
      logger.info("contact_form_logged_no_recipient", { category, messageLength: message.length });
      return apiOk({ delivered: true });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "Access by AMS <onboarding@resend.dev>",
        to,
        reply_to: email,
        subject: `Access by AMS ${category} inquiry from ${name}`,
        text: [
          `Name: ${name}`,
          `Organization: ${organization || "Not provided"}`,
          `Email: ${email}`,
          `Category: ${category}`,
          `Expected round volume: ${expectedRoundVolume || "Not sure yet"}`,
          "",
          message
        ].join("\n")
      })
    });

    if (!resendResponse.ok) {
      logger.error("contact_form_resend_failed", { status: resendResponse.status });
      return apiError("Unable to send message right now.", 502, "SERVER_ERROR");
    }

    logger.info("contact_form_delivered", { category, messageLength: message.length });
    return apiOk({ delivered: true });
  });
}
