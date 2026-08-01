import { createHash } from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

// In-process cache for verified Firebase session cookies.
// Revocation checking (the `true` flag in verifySessionCookie) makes a remote
// Firebase call on every hit. A 60-second TTL reduces that to at most once per
// minute per active session. Worst-case revocation lag is 60 seconds — acceptable
// for this use case. Negative results are never cached so a transient Firebase
// outage doesn't lock out users.
const SESSION_CACHE_TTL_MS = 60_000;
const SESSION_CACHE_MAX = 1_000;
type SessionCacheEntry = { uid: string; cachedAt: number };
const sessionCache = new Map<string, SessionCacheEntry>();

function pruneSessionCache(): void {
  const cutoff = Date.now() - SESSION_CACHE_TTL_MS;
  for (const [key, entry] of sessionCache) {
    if (entry.cachedAt < cutoff) sessionCache.delete(key);
  }
  // If still over the limit after expiry sweep, evict oldest entries (Map preserves insertion order)
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    const toEvict = sessionCache.size - Math.floor(SESSION_CACHE_MAX * 0.8);
    let evicted = 0;
    for (const key of sessionCache.keys()) {
      if (evicted >= toEvict) break;
      sessionCache.delete(key);
      evicted++;
    }
  }
}

export function getFirebaseAdmin() {
  if (!getApps().length) {
    const adminJson = process.env.FIREBASE_ADMIN_SDK_JSON;
    if (!adminJson) throw new Error("FIREBASE_ADMIN_SDK_JSON not set");
    const serviceAccount = JSON.parse(adminJson) as ServiceAccount & { private_key?: string };
    if (typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

export async function getSessionUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("ams_session")?.value;
  if (!sessionCookie) return null;

  // Hash the cookie so the raw value never sits in memory as a cache key
  const key = createHash("sha256").update(sessionCookie).digest("hex").slice(0, 32);
  const now = Date.now();

  const cached = sessionCache.get(key);
  if (cached && now - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    return cached.uid;
  }

  try {
    const decoded = await getFirebaseAdmin().verifySessionCookie(sessionCookie, true);
    pruneSessionCache();
    sessionCache.set(key, { uid: decoded.uid, cachedAt: now });
    return decoded.uid;
  } catch {
    sessionCache.delete(key); // clear any stale entry for a now-invalid cookie
    return null;
  }
}

export type AuthOk = { uid: string; error: null; status: 200 };
export type AuthErr = { uid: null; error: string; status: number };
export type AuthResult = AuthOk | AuthErr;

export async function requireAdmin(): Promise<AuthResult> {
  const uid = await getSessionUid();
  if (!uid) return { uid: null, error: "Sign in required.", status: 401 };
  return { uid, error: null, status: 200 };
}

export async function requireOrgUser(): Promise<AuthResult> {
  const uid = await getSessionUid();
  if (!uid) return { uid: null, error: "Sign in required.", status: 401 };
  return { uid, error: null, status: 200 };
}

export async function createSessionCookie(idToken: string): Promise<string> {
  const expiresIn = 5 * 24 * 60 * 60 * 1000;
  return getFirebaseAdmin().createSessionCookie(idToken, { expiresIn });
}
