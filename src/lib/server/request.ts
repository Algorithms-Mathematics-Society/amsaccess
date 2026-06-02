import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest) {
  const trustedIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? request.ip;
  if (trustedIp) return trustedIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return (
    request.ip ??
    "unknown"
  );
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}
