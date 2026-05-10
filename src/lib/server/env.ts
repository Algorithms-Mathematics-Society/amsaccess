const REQUIRED_PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
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
  const missing = REQUIRED_PUBLIC_ENV.filter((key) => !process.env[key]);
  const invalid: string[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !isHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    invalid.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid
  };
}

export function getSupabaseEnv() {
  const status = getEnvStatus();
  if (!status.ok) {
    throw new Error(`Missing or invalid environment: ${[...status.missing, ...status.invalid].join(", ")}`);
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  };
}

export function getSlowApiThresholdMs() {
  const value = Number(process.env.SLOW_API_MS ?? 750);
  return Number.isFinite(value) && value > 0 ? value : 750;
}
