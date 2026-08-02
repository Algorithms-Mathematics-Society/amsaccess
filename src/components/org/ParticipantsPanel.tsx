"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Plus,
  Printer,
  Ban,
  Users,
} from "lucide-react";

type Participant = {
  user_uid: string;
  login_id: string;
  display_name: string;
  revoked: boolean;
  last_login_at: string | null;
};

type IssuedCredential = {
  login_id: string;
  password: string;
  display_name: string;
  user_uid: string;
};

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

function toCsv(rows: IssuedCredential[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    "login_id,password,display_name",
    ...rows.map((r) => [r.login_id, r.password, r.display_name].map(escape).join(",")),
  ].join("\n");
}

function download(filename: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ParticipantsPanel({
  contestUid,
  contestTitle,
}: {
  contestUid: string;
  contestTitle: string;
}) {
  const [roster, setRoster] = useState<Participant[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  // The credentials from the most recent provisioning call. These exist
  // nowhere else — not in the database, not retrievable by any endpoint — so
  // this state is the only copy until the operator saves it.
  const [issued, setIssued] = useState<IssuedCredential[] | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoster(
        await json<Participant[]>(
          await fetch(`/api/org/contests/${contestUid}/participants`, { cache: "no-store" }),
        ),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the roster.");
    }
  }, [contestUid]);

  useEffect(() => {
    void load();
  }, [load]);

  // Closing the tab with unsaved passwords loses them permanently. The
  // browser's own confirmation is the only thing that can interrupt that.
  useEffect(() => {
    if (issued === null || saved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [issued, saved]);

  if (issued !== null) {
    return (
      <IssuedCredentials
        rows={issued}
        contestTitle={contestTitle}
        saved={saved}
        onSaved={() => setSaved(true)}
        onDone={() => {
          setIssued(null);
          setSaved(false);
          void load();
        }}
      />
    );
  }

  const active = roster?.filter((p) => !p.revoked).length ?? 0;
  const loggedIn = roster?.filter((p) => p.last_login_at).length ?? 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {roster === null
            ? "Loading…"
            : `${active} active · ${loggedIn} signed in${
                roster.length - active > 0 ? ` · ${roster.length - active} revoked` : ""
              }`}
        </p>
        <div className="flex gap-2">
          {roster !== null && roster.length > 0 && (
            <a
              href={`/api/org/contests/${contestUid}/participants/export.csv`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-900"
            >
              <Download className="h-4 w-4" />
              Export roster
            </a>
          )}
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add participants
          </button>
        </div>
      </div>

      {adding && (
        <AddParticipants
          contestUid={contestUid}
          onIssued={(rows) => {
            setAdding(false);
            setIssued(rows);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {roster !== null && roster.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No participants yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Add a roster and the platform issues each person a login ID and password to use in
            the proctor app.
          </p>
        </div>
      ) : (
        roster !== null &&
        roster.length > 0 && (
          <RosterTable contestUid={contestUid} rows={roster} onChange={load} onReissued={(row) => setIssued([row])} />
        )
      )}
    </div>
  );
}

function AddParticipants({
  contestUid,
  onIssued,
  onCancel,
}: {
  contestUid: string;
  onIssued: (rows: IssuedCredential[]) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const names = useMemo(
    () =>
      text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [text],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onIssued(
        await json<IssuedCredential[]>(
          await fetch(`/api/org/contests/${contestUid}/participants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ names }),
          }),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add participants.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
      <label className="block text-sm font-medium text-slate-700">Roster</label>
      <p className="mb-2 text-xs text-slate-500">
        One person per line. Add a comma and your own reference — a roll number, say — to
        reconcile results later:{" "}
        <code className="rounded bg-slate-100 px-1">Asha Rao, ROLL-101</code>
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        autoFocus
        placeholder={"Asha Rao, ROLL-101\nBen Ortiz, ROLL-102\nChen Wei, ROLL-103"}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-900"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || names.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy
            ? "Issuing…"
            : `Issue ${names.length || ""} credential${names.length === 1 ? "" : "s"}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
        <span className="text-xs text-slate-500">
          Passwords are shown once and cannot be recovered.
        </span>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

/** The one-time view of issued passwords.
 *
 * Deliberately blocking: it replaces the roster rather than appearing beside
 * it, and will not dismiss until the operator has saved or printed. These
 * passwords are stored nowhere — losing this screen means reissuing every
 * credential on it.
 */
function IssuedCredentials({
  rows,
  contestTitle,
  saved,
  onSaved,
  onDone,
}: {
  rows: IssuedCredential[];
  contestTitle: string;
  saved: boolean;
  onSaved: () => void;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  function saveCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`credentials-${contestTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stamp}.csv`, toCsv(rows));
    onSaved();
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(toCsv(rows));
      setCopied(true);
      onSaved();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the table is on screen and CSV still works.
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Save these now — they are shown once
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Passwords are stored only as hashes. Nobody, including you, can look them up again.
              If you lose this screen you will have to reissue each credential.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </button>
        <button
          type="button"
          onClick={() => {
            window.print();
            onSaved();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-900"
        >
          <Printer className="h-4 w-4" />
          Print slips
        </button>
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-900"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy all"}
        </button>

        <button
          type="button"
          onClick={onDone}
          disabled={!saved}
          title={saved ? undefined : "Save or print them first"}
          className="ml-auto rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 enabled:hover:border-slate-900 disabled:opacity-40"
        >
          {saved ? "Done" : "Save them first"}
        </button>
      </div>

      <div ref={printRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Login ID</th>
              <th className="px-4 py-2.5">Password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.login_id}>
                <td className="px-4 py-2.5 text-slate-700">{row.display_name}</td>
                <td className="px-4 py-2.5 font-mono text-slate-900">{row.login_id}</td>
                <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{row.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {rows.length} credential{rows.length === 1 ? "" : "s"} for {contestTitle}. Participants
        enter these in the AMS Access proctor app.
      </p>
    </div>
  );
}

function RosterTable({
  contestUid,
  rows,
  onChange,
  onReissued,
}: {
  contestUid: string;
  rows: Participant[];
  onChange: () => void;
  onReissued: (row: IssuedCredential) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(loginId: string, action: "revoke" | "reissue") {
    setBusy(loginId);
    setError("");
    try {
      const result = await json<IssuedCredential | Participant>(
        await fetch(
          `/api/org/contests/${contestUid}/participants/${encodeURIComponent(loginId)}?action=${action}`,
          { method: "POST" },
        ),
      );
      if (action === "reissue") onReissued(result as IssuedCredential);
      else onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action}.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Login ID</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.login_id} className={row.revoked ? "opacity-50" : undefined}>
                <td className="px-4 py-2.5 text-slate-700">{row.display_name}</td>
                <td className="px-4 py-2.5 font-mono text-slate-900">{row.login_id}</td>
                <td className="px-4 py-2.5">
                  {row.revoked ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      revoked
                    </span>
                  ) : row.last_login_at ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      signed in
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">
                      not yet used
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => act(row.login_id, "reissue")}
                      disabled={busy === row.login_id}
                      title="Issue a new password — for a lost slip"
                      className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                    >
                      {busy === row.login_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                      )}
                      Reissue
                    </button>
                    {!row.revoked && (
                      <button
                        type="button"
                        onClick={() => act(row.login_id, "revoke")}
                        disabled={busy === row.login_id}
                        title="Disable this login. The record is kept."
                        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
