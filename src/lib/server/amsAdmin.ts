import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ams_admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type AdminConfig = {
  user: string;
  pass: string;
  secret: string;
};

function adminConfig(): AdminConfig | null {
  const user = process.env.AMSADMIN_USER ?? "";
  const pass = process.env.AMSADMIN_PASSWORD ?? "";
  if (!user || !pass) return null;

  return {
    user,
    pass,
    secret: process.env.AMSADMIN_SESSION_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? pass,
  };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function createSessionToken(config: AdminConfig) {
  const payload = Buffer.from(JSON.stringify({ user: config.user, exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload, config.secret)}`;
}

function verifySessionToken(token: string, config: AdminConfig) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload, config.secret))) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user?: unknown; exp?: unknown };
    return parsed.user === config.user && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAmsAdminAuthenticated() {
  const config = adminConfig();
  if (!config) return false;

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value ?? "";
  return token !== "" && verifySessionToken(token, config);
}

export async function setAmsAdminSession() {
  const config = adminConfig();
  if (!config) throw new Error("AMS admin credentials are not configured.");

  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export async function clearAmsAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function isValidAmsAdminCredential(user: string, pass: string) {
  const config = adminConfig();
  if (!config) return false;
  return safeEqual(user, config.user) && safeEqual(pass, config.pass);
}
