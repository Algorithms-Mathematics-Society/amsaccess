"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, LifeBuoy, Loader2, MonitorCheck, ShieldOff } from "lucide-react";

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

// Staff watch this during a contest, so it must be current — but it is one
// screen among several, so not aggressively so.
const POLL_MS = 10_000;

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

export function InvigilationPanel({ contestUid }: { contestUid: string }) {
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const base = `/api/org/contests/${contestUid}/invigilation`;
      const [r, o, i] = await Promise.all([
        json<ReadinessRow[]>(await fetch(`${base}?view=readiness`, { cache: "no-store" })),
        json<Override[]>(await fetch(`${base}?view=overrides`, { cache: "no-store" })),
        json<Incident[]>(await fetch(`${base}?view=incidents`, { cache: "no-store" })),
      ]);
      setReadiness(r);
      setOverrides(o);
      setIncidents(i);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invigilation data.");
    }
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

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
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
                      <span className="font-mono text-xs text-slate-400">{incident.login_id}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{incident.message}</p>
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
                        act(incident.uid, `${base}?action=resolve-incident&uid=${incident.uid}`)
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

      {/* Devices that failed their own readiness check. */}
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MonitorCheck className="h-4 w-4" />
          Entry-gate reports
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          What each device reported about itself. The proctor app enforces these locally — the
          platform records them. Waive a check to let a candidate through when a detector
          misfires.
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
                    <td className="px-4 py-2.5 text-slate-700">{row.display_name || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-slate-600">
                        {row.device_fingerprint.slice(0, 20)}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">{row.os_name}</span>
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
                  <tr key={grant.uid} className={grant.revoked ? "opacity-50" : undefined}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{grant.check_kind}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      {grant.device_fingerprint.slice(0, 20)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {grant.revoked ? "—" : new Date(grant.expires_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!grant.revoked && (
                        <button
                          type="button"
                          onClick={() =>
                            act(grant.uid, `${base}?action=revoke-override&uid=${grant.uid}`)
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
