"use client";

import { useEffect, useState } from "react";

/**
 * Which role the signed-in staff member holds, for deciding what to render.
 *
 * The console used to ask this in exactly one place — the sidebar — so every
 * other screen drew the same controls for everybody and let the API refuse
 * on click. An intern was shown "Start judges now", pressed it, and got the
 * API's own words back: `insufficient role`. A control you are not allowed
 * to use should not be a control.
 *
 * This is presentation only. Every one of these actions is gated server
 * side, which is where the decision actually lives; hiding a button is a
 * courtesy, not a boundary, and this file must never be the only thing
 * standing between a role and an action.
 *
 * The request is shared across components and made once per page load.
 * Mounting four panels that each want the role should not be four calls, and
 * a role does not change while someone is looking at a screen.
 */

export type OrgRole =
  | "owner"
  | "admin"
  | "problemsetter"
  | "contest_manager"
  | "judge_manager"
  | "intern"
  | string;

/** Roles that may spend money: start judges, run a load test, stand down. */
const SPENDING: readonly OrgRole[] = ["owner", "admin"];

let inFlight: Promise<OrgRole | null> | null = null;

function fetchRole(): Promise<OrgRole | null> {
  inFlight ??= fetch("/api/auth/me")
    .then((r) => (r.ok ? r.json() : null))
    .then((me) => (me && typeof me.role === "string" ? (me.role as OrgRole) : null))
    .catch(() => null);
  return inFlight;
}

export function useOrgRole(): { role: OrgRole | null; known: boolean } {
  const [role, setRole] = useState<OrgRole | null>(null);
  const [known, setKnown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchRole().then((value) => {
      if (cancelled) return;
      setRole(value);
      setKnown(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { role, known };
}

/**
 * May this person change the size of the fleet?
 *
 * Unknown counts as yes. The alternative — hiding the controls until the
 * role arrives — means an admin watching a contest open sees a page with no
 * buttons for as long as one fetch takes, which on a bad connection is
 * exactly when they need them. A wrong guess here costs a 403; the other
 * wrong guess costs a contest.
 */
export function canSpend(role: OrgRole | null, known: boolean): boolean {
  if (!known || role === null) return true;
  return SPENDING.includes(role);
}
