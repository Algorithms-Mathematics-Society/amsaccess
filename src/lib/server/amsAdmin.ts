import { cookies } from "next/headers";

const COOKIE_NAME = "ams_admin_session";

function expectedToken() {
  const user = process.env.AMSADMIN_USER ?? "";
  const pass = process.env.AMSADMIN_PASSWORD ?? "";
  return `${user}:${pass}`;
}

export async function isAmsAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value ?? "";
  return token !== "" && token === expectedToken();
}

export async function setAmsAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60,
    path: "/",
  });
}

export async function clearAmsAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function isValidAmsAdminCredential(user: string, pass: string) {
  return user === (process.env.AMSADMIN_USER ?? "") && pass === (process.env.AMSADMIN_PASSWORD ?? "");
}
