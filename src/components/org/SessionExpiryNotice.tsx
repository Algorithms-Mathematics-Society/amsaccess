"use client";

import { useEffect, useRef, useState } from "react";
import { clearApiCache } from "@/lib/client/useApiQuery";
import { fetchOrgMe } from "@/lib/client/useOrgRole";
import {
  ORG_SIGNED_IN_EVENT,
  ORG_SIGNED_OUT_EVENT,
  orgSignedOut,
  pauseOrgPolling,
  resumeOrgPolling,
} from "@/lib/client/orgPolling";
import { sessionNotice } from "@/lib/client/orgSession";

/** Warns before the fixed staff session ends and says so when it has, without
 *  replacing the page: drafts and filters stay put while the organizer signs
 *  in again in another tab. */
export function SessionExpiryNotice() {
  const [expiresAt, setExpiresAt] = useState<unknown>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const account = useRef<unknown>(undefined);

  useEffect(() => {
    let cancelled = false;
    const wasSignedOut = orgSignedOut();
    void fetchOrgMe(wasSignedOut).then((me) => {
      if (cancelled) return;
      account.current = me?.uid;
      setExpiresAt(me?.session_expires_at ?? null);
      if (
        wasSignedOut &&
        typeof me?.session_expires_at === "number" &&
        me.session_expires_at > Date.now() &&
        orgSignedOut()
      )
        resumeOrgPolling();
    });
    const onSignedOut = () => setSignedOut(true);
    const onSignedIn = () => setSignedOut(false);
    window.addEventListener(ORG_SIGNED_OUT_EVENT, onSignedOut);
    window.addEventListener(ORG_SIGNED_IN_EVENT, onSignedIn);
    setSignedOut(orgSignedOut());
    return () => {
      cancelled = true;
      window.removeEventListener(ORG_SIGNED_OUT_EVENT, onSignedOut);
      window.removeEventListener(ORG_SIGNED_IN_EVENT, onSignedIn);
    };
  }, []);

  const notice = sessionNotice(expiresAt, now, signedOut);

  // A local clock only: no request until the organizer returns to this tab.
  useEffect(() => {
    if (typeof expiresAt !== "number") return;
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(clock);
  }, [expiresAt]);

  // Coming back from the sign-in tab: pick up the new session if it is the
  // same account, otherwise reset like any other account change.
  const noticeKind = notice.kind;
  useEffect(() => {
    if (noticeKind === "signed-out") pauseOrgPolling();
  }, [noticeKind]);
  useEffect(() => {
    if (noticeKind === "none") return;
    let checking = false;
    const recheck = async () => {
      setNow(Date.now());
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const me = await fetchOrgMe(true);
        const next = me?.session_expires_at;
        if (typeof next !== "number" || next <= Date.now()) return;
        if (account.current == null || me?.uid !== account.current) {
          clearApiCache();
          return;
        }
        setExpiresAt(next);
        if (orgSignedOut()) resumeOrgPolling();
      } finally {
        checking = false;
      }
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [noticeKind]);

  if (notice.kind === "none") return null;
  const signIn = (
    <a
      href="/org/login?reauth=1"
      target="_blank"
      className="font-medium underline"
    >
      Sign in again
    </a>
  );
  return notice.kind === "expiring" ? (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-40 max-w-[calc(100vw-2rem)] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow sm:bottom-4 sm:max-w-md"
    >
      Your session ends in {notice.minutesLeft}{" "}
      {notice.minutesLeft === 1 ? "minute" : "minutes"}. {signIn} in a new tab
      to keep working; this page stays as it is.
    </div>
  ) : (
    <div
      role="alert"
      className="fixed bottom-20 left-4 z-40 max-w-[calc(100vw-2rem)] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow sm:bottom-4 sm:max-w-md"
    >
      Your session has expired, so this page has stopped updating. Nothing on it
      is lost. {signIn} in a new tab, then come back here.
    </div>
  );
}
