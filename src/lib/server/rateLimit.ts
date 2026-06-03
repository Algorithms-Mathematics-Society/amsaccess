import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getClientIp } from "@/lib/server/request";

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export const rateLimitPolicies = {
  auth: { limit: 5, windowMs: 60_000 },
  authHourly: { limit: 20, windowMs: 60 * 60_000 },
  contact: { limit: 6, windowMs: 10 * 60_000 },
  waitlist: { limit: 10, windowMs: 10 * 60_000 },
  // publicRead: for unauthenticated endpoints (tighter than privateRead)
  publicRead: { limit: 30, windowMs: 60_000 },
  privateRead: { limit: 120, windowMs: 60_000 },
  adminWrite: { limit: 30, windowMs: 60_000 },
  orgWrite: { limit: 30, windowMs: 60_000 },
  upload: { limit: 120, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  retryAfter: number;
};

// ---------------------------------------------------------------------------
// In-memory store — per-instance fallback when Upstash is not configured.
// NOTE: On serverless/multi-instance deployments each instance has its own
// counter, so the effective limit is limit × number_of_instances. This is
// a known limitation. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// to enable the Redis-backed distributed limiter below.
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __amsRateLimitStore: Map<string, { count: number; resetAt: number }> | undefined;
}

const store =
  globalThis.__amsRateLimitStore ??
  new Map<string, { count: number; resetAt: number }>();
globalThis.__amsRateLimitStore = store;

let lastSweep = 0;

function sweepExpired(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function inMemoryCheck(key: string, policy: RateLimitPolicy): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + policy.windowMs });
    return {
      limited: false,
      remaining: policy.limit - 1,
      retryAfter: Math.ceil(policy.windowMs / 1000),
    };
  }
  if (existing.count >= policy.limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return {
    limited: false,
    remaining: policy.limit - existing.count,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

// ---------------------------------------------------------------------------
// Upstash Redis-backed distributed limiter — active when env vars are set.
// Provides accurate cross-instance rate limiting suitable for serverless.
// Lazy-initialized: creating the Redis client and Ratelimit instances is
// cheap and happens at most once per process (module-level singletons).
// ---------------------------------------------------------------------------
let upstashRedis: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(
  policyName: keyof typeof rateLimitPolicies,
  policy: RateLimitPolicy,
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!upstashRedis) {
    upstashRedis = new Redis({ url, token });
  }

  if (!upstashLimiters.has(policyName)) {
    const windowSeconds = Math.ceil(policy.windowMs / 1000);
    upstashLimiters.set(
      policyName,
      new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(policy.limit, `${windowSeconds} s`),
        prefix: `ams_rl:${policyName}`,
        analytics: false,
      }),
    );
  }

  return upstashLimiters.get(policyName)!;
}

function buildKey(
  policyName: keyof typeof rateLimitPolicies,
  ip: string,
  parts: string[],
  uid?: string | null,
): string {
  const segments = [policyName, ip];
  if (uid) segments.push(`u:${uid}`);
  segments.push(...parts.map((p) => p.trim().toLowerCase()).filter(Boolean));
  return segments.join(":");
}

// ---------------------------------------------------------------------------
// checkRequestRateLimitAsync
// Preferred for security-critical endpoints (auth, amsadmin, contact).
// Uses Upstash when configured; falls back to in-memory on Upstash failure
// so a Redis outage degrades gracefully rather than blocking all traffic.
// ---------------------------------------------------------------------------
export async function checkRequestRateLimitAsync(
  request: NextRequest,
  policyName: keyof typeof rateLimitPolicies,
  parts: string[] = [],
  uid?: string | null,
): Promise<RateLimitResult> {
  const policy = rateLimitPolicies[policyName];
  const ip = getClientIp(request);
  const key = buildKey(policyName, ip, parts, uid);

  const upstash = getUpstashLimiter(policyName, policy);
  if (upstash) {
    try {
      const { success, reset, remaining } = await upstash.limit(key);
      const retryAfter = success
        ? Math.ceil(policy.windowMs / 1000)
        : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return { limited: !success, remaining, retryAfter };
    } catch (err) {
      // Upstash unavailable — degrade to in-memory so traffic is not blocked,
      // but log so operators know distributed limiting is not active.
      console.error(JSON.stringify({ level: "error", event: "upstash_ratelimit_error", policy: policyName, message: err instanceof Error ? err.message : String(err) }));
    }
  }

  return inMemoryCheck(key, policy);
}

// ---------------------------------------------------------------------------
// checkRequestRateLimit (synchronous)
// Kept for routes that have not yet been migrated to the async version.
// In-memory only: per-instance, not effective on multi-instance deployments.
// ---------------------------------------------------------------------------
export function checkRateLimit(key: string, policy: RateLimitPolicy): RateLimitResult {
  return inMemoryCheck(key, policy);
}

export function checkRequestRateLimit(
  request: NextRequest,
  policyName: keyof typeof rateLimitPolicies,
  parts: string[] = [],
  uid?: string | null,
): RateLimitResult {
  const policy = rateLimitPolicies[policyName];
  const ip = getClientIp(request);
  const key = buildKey(policyName, ip, parts, uid);
  return inMemoryCheck(key, policy);
}
