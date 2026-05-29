import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/server/request";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export const rateLimitPolicies = {
  auth: { limit: 5, windowMs: 60_000 },
  authHourly: { limit: 20, windowMs: 60 * 60_000 },
  contact: { limit: 6, windowMs: 10 * 60_000 },
  privateRead: { limit: 120, windowMs: 60_000 },
  adminWrite: { limit: 30, windowMs: 60_000 },
  orgWrite: { limit: 30, windowMs: 60_000 },
  upload: { limit: 120, windowMs: 10 * 60_000 }
} satisfies Record<string, RateLimitPolicy>;

declare global {
  // eslint-disable-next-line no-var
  var __amsRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = globalThis.__amsRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__amsRateLimitStore = store;

let lastSweep = 0;

function sweepExpired(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;

  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function checkRateLimit(key: string, policy: RateLimitPolicy) {
  const now = Date.now();
  sweepExpired(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + policy.windowMs });
    return {
      limited: false,
      remaining: policy.limit - 1,
      retryAfter: Math.ceil(policy.windowMs / 1000)
    };
  }

  if (existing.count >= policy.limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  return {
    limited: false,
    remaining: policy.limit - existing.count,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
  };
}

export function checkRequestRateLimit(request: NextRequest, policyName: keyof typeof rateLimitPolicies, parts: string[] = []) {
  const ip = getClientIp(request);
  const key = [policyName, ip, ...parts.map((part) => part.trim().toLowerCase()).filter(Boolean)].join(":");
  return checkRateLimit(key, rateLimitPolicies[policyName]);
}
