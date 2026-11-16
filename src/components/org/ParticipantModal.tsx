"use client";

/**
 * A participant, opened from inside a contest.
 *
 * Navigating to /org/participants/{id} from a contest was a one-way door:
 * that route belongs to the Students section, so Back landed the reviewer
 * on the roster rather than on the contest they were working through. An
 * invigilator checking twenty sittings had to re-enter the contest, find
 * their place and scroll to where they were, twenty times.
 *
 * So the contest keeps its page and the person opens over it. Same profile
 * body as the full page, so there is one description of a participant and
 * not two that drift. Given a contest, it also shows that person's slice of
 * the contest: roster state, live session and open requests (issue #16).
 */

import { useEffect, useId, useMemo, useRef } from "react";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Modal } from "@/components/Modal";
import { useConfirm } from "./ConfirmDialog";
import { useOrgNotifications } from "@/lib/client/useOrgNotifications";
import { useContestRead } from "@/lib/client/useContestRead";
import { idleLabel, loginState, personContestState, type RosterPerson } from "@/lib/client/personPanel";
import type { NotificationAction } from "@/lib/client/orgNotifications";

const loadProfile = () => import("./ParticipantProfile");
export function preloadParticipantProfile() {
  void loadProfile().catch(() => {});
}
const ParticipantProfile = dynamic(() => loadProfile().then(m => m.ParticipantProfile), {
  loading: () => <p role="status" className="p-6 text-sm text-slate-500">Loading participant…</p>,
});

export function ParticipantModal({
  handle,
  onClose,
  contest,
}: {
  /** Username or uid; the profile route accepts either. */
  handle: string | null;
  onClose: () => void;
  /** Inside a contest console: `live` is whether this role may read the live feed. */
  contest?: { uid: string; live: boolean };
}) {
  const titleId = useId();
  return (
    <Modal open={handle !== null} onClose={onClose} labelledBy={titleId} cardClassName="max-w-5xl">
      {handle && (
        <>
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
            <h2 id={titleId} className="text-sm font-semibold text-slate-900">Participant</h2>
            <div className="flex items-center gap-1">
              <Link
                href={`/org/participants/${encodeURIComponent(handle)}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 md:min-h-8"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Full profile
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 md:h-8 md:w-8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto">
            {contest && <ContestPerson contestUid={contest.uid} live={contest.live} handle={handle} />}
            {/* `inModal` drops the back link and the page's outer padding: both
                belong to the standalone route, and a "Back to students" inside a
                dialog over a contest points at the wrong place entirely. */}
            <ParticipantProfile handle={handle} inModal />
          </div>
        </>
      )}
    </Modal>
  );
}

const pill = "rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600";
const action = "inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-xs font-medium disabled:opacity-40 md:min-h-8";

/** Mounted only while the panel is open; the feed and roster are the console's shared stores. */
function ContestPerson({ contestUid, live, handle }: { contestUid: string; live: boolean; handle: string }) {
  const feed = useOrgNotifications(contestUid, live);
  const roster = useContestRead<RosterPerson[]>("participants");
  const [confirmDialog, confirm] = useConfirm();
  const section = useRef<HTMLElement>(null);
  // Opened from Invigilation before the roster tab was ever visited: one read, not a poll.
  const { data: rosterData, refreshing, error: rosterError, load: loadRoster } = roster;
  useEffect(() => {
    if (rosterData === null && !refreshing && !rosterError) void loadRoster();
    // Once per open; later roster refreshes come from the roster tab itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const state = useMemo(() => personContestState(feed.raw, handle, rosterData), [feed.raw, handle, rosterData]);
  const { rosterRow, session, resumes, incidents } = state;
  const who = rosterRow?.display_name || session?.display_name || state.loginId || "this participant";

  async function decide(id: string, kind: NotificationAction, request: React.ReactNode) {
    const copy = {
      "approve-resume": { title: `Allow re-entry for ${who}?`, body: "This grants permission to resume under the contest’s existing rules. It does not give extra time.", confirmLabel: "Allow re-entry" },
      "reject-resume": { title: `Refuse re-entry for ${who}?`, body: "This declines only this re-entry request.", confirmLabel: "Refuse request", danger: true },
      "resolve-incident": { title: `Resolve ${who}’s help request?`, body: "This moves the request to History.", confirmLabel: "Mark resolved" },
    }[kind];
    if (!(await confirm({ ...copy, body: <><p>{request}</p><p>{copy.body}</p></> }))) return;
    // Failures surface through feed.actionErrors, which the row renders.
    await feed.act(id, kind).catch(() => {});
    // A settled request leaves the list; keep focus inside the dialog so Escape still works.
    if (!section.current?.contains(document.activeElement)) section.current?.focus();
  }

  return (
    <section ref={section} tabIndex={-1} aria-label="In this contest" className="space-y-3 focus:outline-none border-b border-slate-200 px-6 py-4">
      {confirmDialog}
      <h3 className="text-sm font-semibold text-slate-900">In this contest</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Roster</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-slate-800">
            {rosterRow ? (
              <>
                <span className="font-mono text-xs">{rosterRow.login_id}</span>
                <span className={pill}>{loginState(rosterRow)}</span>
                <span className={pill}>{rosterRow.email ? `email ${rosterRow.mail_status || "unsent"}` : "no email"}</span>
              </>
            ) : rosterError ? (
              <span className="text-xs text-red-700">{rosterError}</span>
            ) : rosterData === null ? (
              <span className="text-xs text-slate-500">Loading roster…</span>
            ) : (
              <span className="text-xs text-slate-500">Not on this contest’s roster.</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Live session</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            {!live ? "Not shown for your role." : session ? (
              <>
                <span>State: <span className="font-medium text-slate-800">{session.status}</span></span>
                <span>Last contact: {idleLabel(session.idle_seconds)}</span>
                <span className={session.violation_count > 0 ? "text-amber-700" : undefined}>{session.violation_count} violation{session.violation_count === 1 ? "" : "s"}</span>
                <span>reopened {session.resume_count}×</span>
              </>
            ) : feed.loading ? "Loading…" : feed.errors.length > 0 ? "Couldn’t load this yet; retrying automatically." : "No session yet."}
          </dd>
        </div>
      </dl>

      {live && (resumes.length > 0 || incidents.length > 0) && (
        <ul className="space-y-2">
          {resumes.map((request) => {
            const id = `resume:${request.uid}`;
            const busy = feed.busyIds.has(id);
            return (
              <li key={id} className="rounded-xl border border-red-300 bg-white p-3">
                <p className="text-xs font-medium text-slate-600">Re-entry request · {new Date(request.created_at).toLocaleTimeString()}</p>
                <p className="mt-1 break-words text-sm text-slate-700">{request.reason || "No reason given."}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void decide(id, "approve-resume", request.reason || "No reason given.")}
                    className={`${action} bg-slate-900 text-white hover:bg-slate-700`}>Let them back in</button>
                  <button type="button" disabled={busy} onClick={() => void decide(id, "reject-resume", request.reason || "No reason given.")}
                    className={`${action} border border-slate-300 text-slate-700 hover:border-slate-900`}>Refuse</button>
                </div>
                {feed.actionErrors[id] && <p role="alert" className="mt-2 text-xs text-red-700">{feed.actionErrors[id]}</p>}
              </li>
            );
          })}
          {incidents.map((incident) => {
            const id = `incident:${incident.uid}`;
            const busy = feed.busyIds.has(id);
            return (
              <li key={id} className="rounded-xl border border-amber-300 bg-white p-3">
                <p className="text-xs font-medium text-slate-600">Help request · {incident.category} · {new Date(incident.created_at).toLocaleTimeString()}</p>
                <p className="mt-1 break-words text-sm text-slate-700">{incident.message}</p>
                <button type="button" disabled={busy} onClick={() => void decide(id, "resolve-incident", incident.message)}
                  className={`${action} mt-2 border border-slate-300 text-slate-700 hover:border-slate-900`}>Mark resolved</button>
                {feed.actionErrors[id] && <p role="alert" className="mt-2 text-xs text-red-700">{feed.actionErrors[id]}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {/* shortcut: submissions and support tickets are not shown; the contest submissions list cannot be filtered by person and caps at 100, and the support inbox has no contest or person filter. Add both once ams-api offers per-person filters. */}
    </section>
  );
}
