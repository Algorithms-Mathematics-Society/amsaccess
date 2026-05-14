import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { logger, withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
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
    const organization = cleanText(record.organization, 160);
    const email = normalizeEmail(cleanText(record.email, 180));
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
      console.info("contact_form_submission", contactPayload);
      logger.info("contact_form_logged", { email, category, messageLength: message.length });
      return apiOk({ delivered: true });
    }

    const to = process.env.CONTACT_TO_EMAIL ?? process.env.RESEND_TO_EMAIL;
    if (!to) {
      console.info("contact_form_submission_missing_recipient", contactPayload);
      logger.info("contact_form_logged", { email, category, messageLength: message.length });
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

    logger.info("contact_form_delivered", { email, category, messageLength: message.length });
    return apiOk({ delivered: true });
  });
}
