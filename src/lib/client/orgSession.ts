/** Warn this long before the fixed-length staff session ends. */
export const SESSION_WARNING_MS = 15 * 60_000;

export type SessionNotice =
  | { kind: "none" }
  | { kind: "expiring"; minutesLeft: number }
  | { kind: "signed-out" };

/** `expiresAt` is epoch ms from `/api/auth/me`; null or junk means unknown. */
export function sessionNotice(expiresAt: unknown, now: number, signedOut: boolean): SessionNotice {
  if (signedOut) return { kind: "signed-out" };
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return { kind: "none" };
  const left = expiresAt - now;
  if (left <= 0) return { kind: "signed-out" };
  if (left <= SESSION_WARNING_MS) return { kind: "expiring", minutesLeft: Math.ceil(left / 60_000) };
  return { kind: "none" };
}
