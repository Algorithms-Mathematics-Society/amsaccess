"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  DoorOpen,
  LifeBuoy,
  Loader2,
  MonitorCheck,
  ShieldOff,
  Users,
  X,
} from "lucide-react";

type ReadinessRow = {
  uid: string;
  device_fingerprint: string;
  os_name: string;
  app_version: string;
  passed: boolean;
  failed_checks: string[];
  display_name: string;
  created_at: string;
};

type Override = {
  uid: string;
  device_fingerprint: string;
  check_kind: string;
  reason: string;
  expires_at: string;
  revoked: boolean;
  granted_by: string;
};

type Incident = {
  uid: string;
  category: string;
  message: string;
  contact: string;
  status: string;
  created_at: string;
  display_name: string;
  login_id: string;
};

type ResumeRequest = {
  uid: string;
  status: string;
  reason: string;
  device_fingerprint: string;
  created_at: string;
  session_uid: string;
  display_name: string;
  login_id: string;
  resume_count: number;
};

type SessionRow = {
  uid: string;
  login_id: string;
  display_name: string;
  status: string;
  started_at: string | null;
  last_seen_at: string | null;
  violation_count: number;
  resume_count: number;
  // Computed by the API against its own clock, never here — a console laptop
  // an hour out would otherwise paint the whole room as stalled.
  idle_seconds: number | null;
  resume_pending: boolean;
};

/** How long a session may go unheard from before it is worth looking at. */
const QUIET_AFTER_SECONDS = 120;

function idleLabel(seconds: number | null): string {
  if (seconds === null) return "never checked in";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

// Staff watch this during a contest, so it must be current — but it is one
// screen among several, so not aggressively so.
const POLL_MS = 10_000;

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

export function InvigilationPanel({ contestUid }: { contestUid: string }) {
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resumes, setResumes] = useState<ResumeRequest[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const base = `/api/org/contests/${contestUid}/invigilation`;

    // Each view is fetched independently and failures are per-section, not
    // per-panel. Promise.all here meant one endpoint hiccuping blanked all
    // five, so an invigilator mid-contest could lose the help-request list
    // because the roster was briefly unhappy — and a view the deployed API
    // does not yet serve took the whole screen down with it.
    async function view<T>(name: string): Promise<T | null> {
      try {
        return await json<T>(
          await fetch(`${base}?view=${name}`, { cache: "no-store" }),
        );
      } catch {
        return null;
      }
    }

    const [r, o, i, q, live] = await Promise.all([
      view<ReadinessRow[]>("readiness"),
      view<Override[]>("overrides"),
      view<Incident[]>("incidents"),
      view<ResumeRequest[]>("resume-requests"),
      view<SessionRow[]>("sessions"),
    ]);

    if (r) setReadiness(r);
    if (o) setOverrides(o);
    if (i) setIncidents(i);
    if (q) setResumes(q);
    if (live) setSessions(live);

    // Only complain when nothing at all came back — that is a signed-out or
    // unreachable console, which is worth interrupting somebody for. A single
    // missing view is not, and holding the last good data beats replacing a
    // working screen with an error during a contest.
    const missing = [r, o, i, q, live].filter((value) => value === null).length;
    setError(missing === 5 ? "Could not load invigilation data." : "");
  }, [contestUid]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function act(key: string, url: string, body?: unknown) {
    setBusy(key);
    setError("");
    try {
      await json(
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  const base = `/api/org/contests/${contestUid}/invigilation`;
  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const blocked = readiness.filter((r) => !r.passed);
  const liveOverrides = overrides.filter((o) => !o.revoked);
  const waiting = resumes.filter((r) => r.status === "pending");
  const quiet = sessions.filter(
    (row) =>
      (row.status === "active" || row.status === "pending") &&
      (row.idle_seconds === null || row.idle_seconds >= QUIET_AFTER_SECONDS),
  );

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Waiting to resume, above everything: a candidate is locked out of an
          exam that is still running, and only a person can let them back in. */}
      {waiting.length > 0 && (
        <section>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <DoorOpen className="h-4 w-4" />
            Waiting to resume
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              {waiting.length}
            </span>
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Their app closed mid-exam. Approving issues a 15-minute window to
            rejoin — it does not reopen a session that has already been
            submitted, and it does not give extra time.
          </p>

          <div className="space-y-2">
            {waiting.map((request) => (
              <div
                key={request.uid}
                className="rounded-xl border border-red-300 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {request.display_name || "Unknown"}{" "}
                      <span className="font-mono text-xs text-slate-400">
                        {request.login_id}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {request.reason || "No reason given."}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(request.created_at).toLocaleTimeString()}
                      {request.device_fingerprint && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="font-mono">
                            {request.device_fingerprint}
                          </span>
                        </>
                      )}
                      {/* Someone on their fourth reopen is a different
                          conversation from someone on their first. */}
                      {request.resume_count > 0 &&
                        ` · reopened ${request.resume_count}× already`}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        act(
                          request.uid,
                          `${base}?action=approve-resume&uid=${request.uid}`,
                          {},
                        )
                      }
                      disabled={busy === request.uid}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                    >
                      {busy === request.uid ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Let them back in
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        act(
                          request.uid,
                          `${base}?action=reject-resume&uid=${request.uid}`,
                          {},
                        )
                      }
                      disabled={busy === request.uid}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" />
                      Refuse
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Help requests first: someone is waiting. */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <LifeBuoy className="h-4 w-4" />
          Help requests
          {openIncidents.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {openIncidents.length} open
            </span>
          )}
        </h3>

        {incidents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
            Nobody has asked for help.
          </p>
        ) : (
          <div className="space-y-2">
            {incidents.map((incident) => (
              <div
                key={incident.uid}
                className={`rounded-xl border bg-white p-4 ${
                  incident.status === "resolved"
                    ? "border-slate-200 opacity-60"
                    : "border-amber-300"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {incident.display_name || "Unknown"}{" "}
                      <span className="font-mono text-xs text-slate-400">
                        {incident.login_id}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {incident.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {incident.category}
                      {incident.contact && ` · ${incident.contact}`} ·{" "}
                      {new Date(incident.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {incident.status !== "resolved" ? (
                    <button
                      type="button"
                      onClick={() =>
                        act(
                          incident.uid,
                          `${base}?action=resolve-incident&uid=${incident.uid}`,
                        )
                      }
                      disabled={busy === incident.uid}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900 disabled:opacity-40"
                    >
                      {busy === incident.uid ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Mark resolved
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">resolved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* The room. Nothing else says who is actually sitting this contest, so
          a session going quiet used to be invisible until the candidate found
          somebody to tell — and the reaper marked rows nobody could see. */}
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4" />
          Live sessions
          {quiet.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {quiet.length} quiet
            </span>
          )}
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Sorted so the ones needing a person come first. A row whose last
          contact keeps climbing is a candidate whose machine stopped talking to
          us — worth a look before they find you.
        </p>

        {sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
            Nobody has started this contest yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">State</th>
                  <th className="px-4 py-2.5">Last contact</th>
                  <th className="px-4 py-2.5 text-right">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((row) => {
                  const running =
                    row.status === "active" || row.status === "pending";
                  const isQuiet =
                    running &&
                    (row.idle_seconds === null ||
                      row.idle_seconds >= QUIET_AFTER_SECONDS);
                  return (
                    <tr
                      key={row.uid}
                      className={isQuiet ? "bg-amber-50/60" : undefined}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-900">
                          {row.display_name || "Unknown"}
                        </span>{" "}
                        <span className="font-mono text-xs text-slate-400">
                          {row.login_id}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {row.status}
                        {row.resume_pending && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            waiting on you
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${isQuiet ? "font-medium text-amber-800" : "text-slate-500"}`}
                      >
                        {/* Only meaningful while a session is meant to be
                            live. After the bell, a long silence is just a
                            candidate who finished and closed their laptop. */}
                        {running ? idleLabel(row.idle_seconds) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-500">
                        {row.violation_count > 0 && (
                          <span className="mr-2 inline-flex items-center gap-1 text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.violation_count}
                          </span>
                        )}
                        {row.resume_count > 0 && (
                          <span>reopened {row.resume_count}×</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Devices that failed their own readiness check. */}
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MonitorCheck className="h-4 w-4" />
          Entry-gate reports
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          What each device reported about itself. The proctor app enforces these
          locally — the platform records them. Waive a check to let a candidate
          through when a detector misfires.
        </p>

        {readiness.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
            No devices have reported yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">Device</th>
                  <th className="px-4 py-2.5">Result</th>
                  <th className="px-4 py-2.5 text-right">Waive a check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readiness.map((row) => (
                  <tr key={row.uid}>
                    <td className="px-4 py-2.5 text-slate-700">
                      {row.display_name || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-slate-600">
                        {row.device_fingerprint.slice(0, 20)}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {row.os_name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.passed ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {row.failed_checks.join(", ") || "failed"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!row.passed && row.failed_checks.length > 0 && (
                        <GrantWaiver
                          checks={row.failed_checks}
                          device={row.device_fingerprint}
                          busy={busy === row.uid}
                          onGrant={(checkKind, reason) =>
                            act(row.uid, `${base}?action=grant-override`, {
                              device_fingerprint: row.device_fingerprint,
                              check_kind: checkKind,
                              reason,
                              minutes: 120,
                            })
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Waivers currently in force. */}
      {overrides.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldOff className="h-4 w-4" />
            Waivers
            {liveOverrides.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {liveOverrides.length} active
              </span>
            )}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Check</th>
                  <th className="px-4 py-2.5">Device</th>
                  <th className="px-4 py-2.5">Expires</th>
                  <th className="px-4 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overrides.map((grant) => (
                  <tr
                    key={grant.uid}
                    className={grant.revoked ? "opacity-50" : undefined}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {grant.check_kind}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      {grant.device_fingerprint.slice(0, 20)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {grant.revoked
                        ? "—"
                        : new Date(grant.expires_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!grant.revoked && (
                        <button
                          type="button"
                          onClick={() =>
                            act(
                              grant.uid,
                              `${base}?action=revoke-override&uid=${grant.uid}`,
                            )
                          }
                          disabled={busy === grant.uid}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/** Waiving a check is a judgement an invigilator makes in person, so the
 * reason is asked for rather than optional-and-forgotten. */
function GrantWaiver({
  checks,
  device,
  busy,
  onGrant,
}: {
  checks: string[];
  device: string;
  busy: boolean;
  onGrant: (checkKind: string, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [checkKind, setCheckKind] = useState(checks[0] ?? "");
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-900"
      >
        Waive…
      </button>
    );
  }

  return (
    <div className="ml-auto max-w-xs space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left">
      <select
        value={checkKind}
        onChange={(e) => setCheckKind(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
      >
        {checks.map((check) => (
          <option key={check} value={check}>
            {check}
          </option>
        ))}
      </select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why — e.g. verified in person"
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <p className="text-[11px] text-slate-500">
        Valid 2 hours, for {device.slice(0, 12)}… only.
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            onGrant(checkKind, reason);
            setOpen(false);
            setReason("");
          }}
          disabled={busy || !reason.trim()}
          title={reason.trim() ? undefined : "Give a reason"}
          className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          Grant
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
