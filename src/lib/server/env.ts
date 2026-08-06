/** What this app genuinely needs to function.
 *
 * The health check used to require Supabase credentials. Nothing has used
 * Supabase since the backend moved to ams-api, so a correctly-configured
 * deployment reported itself unhealthy — and a health check that is wrong
 * about the healthy case teaches everyone to ignore it.
 *
 * Cognito is listed but not required: staff sign-in breaks without it while
 * everything else keeps working, so a missing pool id is worth reporting
 * without failing the whole service.
 */

const REQUIRED_ENV = ["AMS_API_URL", "AMS_INTERNAL_API_SECRET"] as const;

const RECOMMENDED_ENV = [
  "AMS_COGNITO_USER_POOL_ID",
  "AMS_COGNITO_CLIENT_ID",
  "AMS_AWS_REGION",
] as const;

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getEnvStatus() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  const degraded = RECOMMENDED_ENV.filter((key) => !process.env[key]);
  const invalid: string[] = [];

  if (process.env.AMS_API_URL && !isHttpUrl(process.env.AMS_API_URL)) {
    invalid.push("AMS_API_URL");
  }

  // Not a configuration error but a live security problem: this bypasses
  // authentication entirely, so a production build carrying it is worth
  // reporting as loudly as a missing secret.
  if (process.env.NODE_ENV === "production" && process.env.AMS_DEV_SUBJECT) {
    invalid.push("AMS_DEV_SUBJECT (set in production — it bypasses auth)");
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    degraded,
  };
}

export function getSlowApiThresholdMs() {
  const value = Number(process.env.SLOW_API_MS ?? 750);
  return Number.isFinite(value) && value > 0 ? value : 750;
}
