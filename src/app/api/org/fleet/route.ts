import { proxy } from "../mail/_proxy";

/** What is judging right now: live workers, their idle time, the backlog.
 *
 * Read-only and available to any org staff member — noticing that judging
 * has stalled is not a privileged act. Changing the fleet's size is, and
 * that lives elsewhere.
 */
export async function GET() {
  return proxy("GET", "/fleet");
}
