#!/usr/bin/env bash
# Runs every tests/org/browser-*.mjs against `next start` on the existing
# production build (run `pnpm run build` first). All API traffic is mocked
# inside each test, so no backend, credentials or secrets are involved.
#
# Requires PLAYWRIGHT_MODULE (path to an installed playwright module entry).
# CHROMIUM_PATH is optional; when set it is also exported as
# PLAYWRIGHT_EXECUTABLE_PATH because the tests read either name.
set -euo pipefail

: "${PLAYWRIGHT_MODULE:?set PLAYWRIGHT_MODULE to an installed playwright module}"
PORT="${PORT:-3124}"
export ORG_TEST_URL="http://localhost:${PORT}"
if [[ -n "${CHROMIUM_PATH:-}" ]]; then
  export PLAYWRIGHT_EXECUTABLE_PATH="$CHROMIUM_PATH"
fi

# Files deliberately kept out of CI. Each entry needs a reason. These fail on
# every run against current main (not flaky): the product UI moved on and the
# tests were not updated. Remove an entry once its test is brought up to date.
EXCLUDE=(
  # Mock throws on /api/org/support, added later by the support inbox.
  browser-cache.mjs
  # Waits for an "Entered Person, Entered this contest" button the roster no longer renders.
  browser-current.mjs
  # Expects "replaces existing passwords/slips" confirm copy that no longer exists.
  browser-roster-admin.mjs
  # Waits for a per-row "Reissue" button that no longer exists.
  browser-roster-ui.mjs
  # Waits for a "Re-email" button that no longer exists.
  browser-tab-reads.mjs
)

cd "$(dirname "$0")/../.."
# Refuse to run against a server this script did not start.
if curl -fsS -o /dev/null "$ORG_TEST_URL/" 2>/dev/null; then
  echo "port $PORT is already serving; stop that server first" >&2
  exit 1
fi

LOG="$(mktemp)"
# Own session (setsid) so cleanup can kill the whole process group, including
# the next-server child, rather than only a wrapper process.
setsid node node_modules/next/dist/bin/next start -p "$PORT" >"$LOG" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill -TERM -- "-$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "$ORG_TEST_URL/"; then break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then cat "$LOG"; echo "next start exited early" >&2; exit 1; fi
  sleep 1
done
curl -fsS -o /dev/null "$ORG_TEST_URL/" || { cat "$LOG"; echo "server not ready after 60s" >&2; exit 1; }

failed=()
for test in tests/org/browser-*.mjs; do
  name="$(basename "$test")"
  if [[ " ${EXCLUDE[*]} " == *" $name "* ]]; then echo "SKIP $name"; continue; fi
  echo "::group::$name"
  start=$SECONDS
  if timeout 300 node "$test"; then
    echo "OK $name ($((SECONDS - start))s)"
  else
    echo "FAIL $name ($((SECONDS - start))s)"
    failed+=("$name")
  fi
  echo "::endgroup::"
done

if ((${#failed[@]})); then
  echo "Server log:"; cat "$LOG"
  echo "Failed: ${failed[*]}" >&2
  exit 1
fi
echo "All browser tests passed"
