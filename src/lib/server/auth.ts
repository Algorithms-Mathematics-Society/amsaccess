import { initializeApp, getApps, cert } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const GO_API_URL = process.env.GO_API_URL ?? "http://localhost:8080";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";

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
  try {
    const decoded = await getFirebaseAdmin().verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
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

function internalHeaders(firebaseUid: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${INTERNAL_API_SECRET}`,
    "X-Firebase-UID": firebaseUid,
  };
}

export type GoApiResult = {
  status: number;
  contentType: string;
  data: unknown;
};

export async function callGoApi(
  method: string,
  path: string,
  body: FormData | Record<string, unknown> | null,
  firebaseUid: string | null,
): Promise<GoApiResult> {
  const headers = internalHeaders(firebaseUid ?? "");
  if (body !== null && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${GO_API_URL}${path}`, {
    method,
    headers,
    body: body instanceof FormData
      ? body
      : body !== null
      ? JSON.stringify(body)
      : undefined,
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 204) {
    return { status: res.status, contentType, data: null };
  }

  if (contentType.includes("application/json")) {
    return {
      status: res.status,
      contentType,
      data: await res.json(),
    };
  }

  return {
    status: res.status,
    contentType,
    data: await res.text(),
  };
}

export async function proxyToGoApi(
  method: string,
  path: string,
  body: FormData | Record<string, unknown> | null,
  firebaseUid: string | null,
): Promise<NextResponse> {
  const res = await callGoApi(method, path, body, firebaseUid);
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(res.data, { status: res.status });
}
