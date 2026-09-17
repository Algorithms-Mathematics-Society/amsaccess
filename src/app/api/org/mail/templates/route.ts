import { proxy } from "../_proxy";

export async function GET(request: Request) {
  // `?variables=1` returns the placeholder list instead — the editor needs
  // both on the same screen and one route keeps the client simple.
  const wantVariables = new URL(request.url).searchParams.has("variables");
  return proxy("GET", wantVariables ? "/mail/templates/variables" : "/mail/templates");
}

/** Create the platform's two default templates where missing. */
export async function POST() {
  return proxy("POST", "/mail/templates/defaults", {});
}
