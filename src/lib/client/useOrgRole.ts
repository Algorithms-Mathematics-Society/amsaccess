"use client";

import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
} from "react";
import { reportOrgResponse } from "./orgPolling";

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
 * The layout seeds the role. A failed server lookup can fall back to the
 * same client read that handles re-sign-in.
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

export type OrgMe = {
  role?: unknown;
  uid?: unknown;
  session_expires_at?: unknown;
};
let inFlight: Promise<OrgMe | null> | null = null;
// An explicit null discards the server seed after the session changes.
let confirmedMe: OrgMe | null | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getMe = () => confirmedMe;
const getServerMe = () => undefined;
const OrgSession = createContext<OrgMe | null>(null);

export function OrgSessionProvider({
  initialMe,
  children,
}: {
  initialMe: OrgMe | null;
  children: React.ReactNode;
}) {
  return createElement(OrgSession.Provider, { value: initialMe }, children);
}

export function useOrgInitialSession() {
  return useContext(OrgSession);
}

// Only the session notice adopts this account after its identity checks.
export function confirmOrgMe(me: OrgMe | null) {
  if (confirmedMe === me) return;
  confirmedMe = me;
  listeners.forEach((listener) => listener());
}

/** The shared `/api/auth/me` read; `fresh` replaces it, e.g. after re-sign-in. */
export function fetchOrgMe(fresh = false): Promise<OrgMe | null> {
  if (fresh) inFlight = null;
  if (!inFlight) {
    const request = fetch("/api/auth/me")
      .then((r) => {
        if (inFlight === request) reportOrgResponse(r.status);
        return r.ok ? r.json() : null;
      })
      .catch(() => null);
    inFlight = request;
  }
  return inFlight;
}

export function useOrgRole(): { role: OrgRole | null; known: boolean } {
  const initialMe = useOrgInitialSession();
  const refreshedMe = useSyncExternalStore(subscribe, getMe, getServerMe);
  const me =
    refreshedMe !== undefined &&
    (refreshedMe === null || !initialMe || refreshedMe.uid === initialMe.uid)
      ? refreshedMe
      : initialMe;
  const role = typeof me?.role === "string" ? me.role : null;
  return { role, known: role !== null };
}

/**
 * May this person change the size of the fleet?
 *
 * Wait for a confirmed role when the server lookup could not seed one.
 */
export function canSpend(role: OrgRole | null, known: boolean): boolean {
  return known && role !== null && SPENDING.includes(role);
}
