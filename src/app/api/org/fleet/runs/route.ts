import { proxy } from "../../mail/_proxy";

/** Past probes and load tests: what was run, by whom, and how fast. */
export async function GET() {
  return proxy("GET", "/fleet/runs");
}
