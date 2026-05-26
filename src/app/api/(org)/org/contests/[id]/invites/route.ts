import type { NextRequest } from "next/server";
import { apiError, apiOk, apiRateLimited } from "@/lib/server/http";
import { withApiLogging } from "@/lib/server/logger";
import { checkRequestRateLimit } from "@/lib/server/rateLimit";
import { normalizeEmail, isValidEmail } from "@/lib/server/request";
import { callGoApi, requireOrgUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiLogging("org.contest_invites.create", async () => {
    const limited = checkRequestRateLimit(request, "orgWrite", ["contest-invites", params.id]);
    if (limited.limited) return apiRateLimited(limited.retryAfter);

    const auth = await requireOrgUser();
    if (auth.error || !auth.uid) return apiError(auth.error ?? "Sign in required.", auth.status ?? 401, "UNAUTHORIZED");

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return apiError("Invalid request body.", 400, "BAD_REQUEST");
    }

    const record = payload as Record<string, unknown>;
    const rawEmails = Array.isArray(record.emails) ? record.emails : [];
    const emails = rawEmails
      .map((value) => (typeof value === "string" ? normalizeEmail(value) : ""))
      .filter((value): value is string => Boolean(value) && isValidEmail(value));

    if (emails.length === 0) {
      return apiError("At least one valid email is required.", 400, "BAD_REQUEST");
    }

    const settingsRes = await callGoApi("GET", "/org/settings", null, auth.uid);
    const settings = (settingsRes.data ?? {}) as Record<string, unknown>;
    const allowBulk = Boolean(settings.allow_bulk_invites ?? true);
    if (!allowBulk) return apiError("Bulk invite emails are disabled for your organization.", 403, "FORBIDDEN");
    const subjectTemplate = typeof record.subject === "string" && record.subject.trim() !== ""
      ? record.subject.trim().slice(0, 180)
      : typeof settings.invite_subject_template === "string"
      ? settings.invite_subject_template.slice(0, 180)
      : "";
    const bodyTemplate = typeof record.body === "string" && record.body.trim() !== ""
      ? record.body.trim().slice(0, 8000)
      : typeof settings.invite_body_template === "string"
      ? settings.invite_body_template.slice(0, 8000)
      : "";

    const res = await callGoApi("POST", `/org/contests/${params.id}/invites`, { emails }, auth.uid);
    if (res.status !== 200) {
      return apiError(
        typeof res.data === "object" && res.data && "error" in res.data ? String((res.data as { error: unknown }).error) : "Unable to save invites.",
        res.status,
        res.status === 400 ? "BAD_REQUEST" : res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
      );
    }

    let emailsSent = 0;
    if (subjectTemplate && bodyTemplate && process.env.RESEND_API_KEY) {
      const fromName = typeof settings.email_from_name === "string" && settings.email_from_name.trim() !== ""
        ? settings.email_from_name.trim()
        : "Access by AMS";
      const from = process.env.RESEND_FROM_EMAIL ?? `${fromName} <onboarding@resend.dev>`;
      await Promise.all(
        emails.map(async (email) => {
          const subject = renderInviteTemplate(subjectTemplate, { email });
          const text = renderInviteTemplate(bodyTemplate, { email });
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: email,
              subject,
              text,
            }),
          });
          if (resendRes.ok) emailsSent += 1;
        }),
      );
    }

    const data = res.data as { inserted: number };
    return apiOk({ invited: data.inserted, emailsSent });
  });
}

function renderInviteTemplate(template: string, values: { email: string }) {
  return template
    .replaceAll("{{email}}", values.email)
    .replaceAll("{{download_url}}", "https://amsaccess.com/download")
    .replaceAll("{{download_link}}", "https://amsaccess.com/download")
    .replaceAll("{{contest_id}}", "");
}
