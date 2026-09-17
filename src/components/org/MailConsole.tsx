"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { formatWhen } from "@/lib/orgTypes";
import type { Contest } from "@/lib/orgTypes";

/**
 * The mail console.
 *
 * Two things live here and they are deliberately separate. *Templates* are
 * copy, stored in SES, edited in place — a wording change is not a deploy.
 * *Sends* are batches of one row per recipient; a send queues rows and the
 * API's drain delivers them at SES's pace, so the number that matters on
 * this screen is never "1,987 of 2,000" but the status next to a name.
 *
 * Credential mail is not sent from here. It has a passphrase to make and a
 * roster to reason about, so it lives on the contest's Participants tab; the
 * batches it creates show up in the list below like any other.
 */

type Template = {
  name: string;
  subject: string;
  text: string;
  html: string;
  placeholders: string[];
};

type Variable = { name: string; sample: string };

type Counts = Record<string, number>;

type Batch = {
  uid: string;
  label: string;
  template_name: string;
  kind: string;
  contest_uid: string | null;
  contest_title: string;
  total: number;
  counts: Counts;
  created_at: string;
};

type Message = {
  uid: string;
  to_email: string;
  to_name: string;
  status: string;
  attempts: number;
  last_error: string;
  feedback: string;
  sent_at: string | null;
  feedback_at: string | null;
};

type BatchDetail = Batch & { messages: Message[] };

const POLL_MS = 5000;

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

const STATUS_STYLE: Record<string, string> = {
  queued: "border-slate-200 bg-white text-slate-600",
  sending: "border-sky-200 bg-sky-50 text-sky-700",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  bounced: "border-red-200 bg-red-50 text-red-700",
  complained: "border-red-300 bg-red-100 text-red-800",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[status] ?? STATUS_STYLE.queued}`}
    >
      {status}
    </span>
  );
}

function inFlight(counts: Counts): boolean {
  return (counts.queued ?? 0) + (counts.sending ?? 0) > 0;
}

export function MailConsole() {
  const [tab, setTab] = useState<"sends" | "templates">("sends");

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {(
          [
            ["sends", "Sends"],
            ["templates", "Templates"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
              tab === key
                ? "border-slate-900 font-medium text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "sends" ? <Sends /> : <Templates />}
    </div>
  );
}

// ── sends ─────────────────────────────────────────────────────────────────

function Sends() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setBatches(await json<Batch[]>(await fetch("/api/org/mail/batches", { cache: "no-store" })));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sends.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep polling while anything is still going out, and stop when it is not:
  // an idle console should not be hitting the API every five seconds.
  const active = batches?.some((b) => inFlight(b.counts)) ?? false;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [active, load]);

  if (open) {
    return <BatchView uid={open} onBack={() => { setOpen(null); void load(); }} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {batches === null
            ? "Loading…"
            : `${batches.length} send${batches.length === 1 ? "" : "s"}${
                active ? " · delivering" : ""
              }`}
        </p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New send
        </button>
      </div>

      {creating && (
        <NewSend
          onQueued={(batch) => {
            setCreating(false);
            setOpen(batch.uid);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {batches !== null && batches.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Mail className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Nothing sent yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Credential emails are sent from a contest&apos;s Participants tab. Anything else —
            a reminder, a schedule change — starts with New send.
          </p>
        </div>
      ) : (
        batches !== null &&
        batches.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Send</th>
                  <th className="px-4 py-2.5">Template</th>
                  <th className="px-4 py-2.5 text-right">Recipients</th>
                  <th className="px-4 py-2.5">Progress</th>
                  <th className="px-4 py-2.5">Queued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr
                    key={b.uid}
                    onClick={() => setOpen(b.uid)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{b.label}</p>
                      {b.contest_title && (
                        <p className="text-xs text-slate-500">{b.contest_title}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                      {b.template_name}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {b.total}
                    </td>
                    <td className="px-4 py-2.5">
                      <Progress counts={b.counts} total={b.total} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{formatWhen(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function Progress({ counts, total }: { counts: Counts; total: number }) {
  const sent = counts.sent ?? 0;
  const bad = (counts.failed ?? 0) + (counts.bounced ?? 0) + (counts.complained ?? 0);
  const pending = (counts.queued ?? 0) + (counts.sending ?? 0);
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-emerald-500"
          style={{ width: total ? `${(sent / total) * 100}%` : "0%" }}
        />
      </div>
      <span className="tabular-nums text-slate-600">
        {sent} sent
        {bad > 0 && <span className="text-red-600"> · {bad} failed</span>}
        {pending > 0 && <span className="text-slate-400"> · {pending} to go</span>}
      </span>
    </div>
  );
}

function NewSend({
  onQueued,
  onCancel,
}: {
  onQueued: (batch: Batch) => void;
  onCancel: () => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [contestUid, setContestUid] = useState("");
  const [label, setLabel] = useState("");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [t, c] = await Promise.all([
          json<Template[]>(await fetch("/api/org/mail/templates", { cache: "no-store" })),
          json<Contest[]>(await fetch("/api/org/contests", { cache: "no-store" })),
        ]);
        // The credential template is sent from the roster, where the
        // passphrase logic lives; offering it here would only fail.
        setTemplates(t.filter((x) => x.name !== "contest-credentials"));
        setContests(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load.");
      }
    })();
  }, []);

  // "email, Name" per line; a bare email is fine too.
  const recipients = useMemo(
    () =>
      pasted
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [email, ...rest] = line.split(",");
          return { email: (email ?? "").trim(), name: rest.join(",").trim() };
        })
        .filter((r) => r.email.includes("@")),
    [pasted],
  );

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const batch = await json<Batch>(
        await fetch("/api/org/mail/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_name: templateName,
            label: label.trim(),
            contest_uid: contestUid || null,
            recipients,
          }),
        }),
      );
      onQueued(batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue the send.");
    } finally {
      setBusy(false);
    }
  }

  const nobody = !contestUid && recipients.length === 0;

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Template</span>
          <select
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Pick a template…</option>
            {templates.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} — {t.subject}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Contest roster (optional)</span>
          <select
            value={contestUid}
            onChange={(e) => setContestUid(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Nobody from a roster</option>
            {contests.map((c) => (
              <option key={c.uid} value={c.uid}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-700">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Schedule reminder, Round 1"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-700">
            Extra recipients — one per line, <code>email, Name</code>
          </span>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder={"asha@example.com, Asha Rao\nrahul@example.com"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !templateName || nobody}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Queue send
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <p className="text-xs text-slate-500">
          {contestUid && "everyone on the roster with an email"}
          {contestUid && recipients.length > 0 && " + "}
          {recipients.length > 0 && `${recipients.length} pasted`}
          {nobody && "Pick a roster or paste addresses."}
        </p>
      </div>
    </div>
  );
}

function BatchView({ uid, onBack }: { uid: string; onBack: () => void }) {
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    try {
      setBatch(
        await json<BatchDetail>(await fetch(`/api/org/mail/batches/${uid}`, { cache: "no-store" })),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the send.");
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = batch ? inFlight(batch.counts) : false;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [active, load]);

  async function retry(path: string, key: string) {
    setBusy(key);
    try {
      await json(await fetch(path, { method: "POST" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retry.");
    } finally {
      setBusy(null);
    }
  }

  const rows = useMemo(
    () => (batch?.messages ?? []).filter((m) => !filter || m.status === filter),
    [batch, filter],
  );
  const failed = batch?.counts.failed ?? 0;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-slate-500 hover:text-slate-900"
      >
        ← All sends
      </button>

      {batch && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{batch.label}</h2>
            <p className="text-sm text-slate-500">
              <span className="font-mono text-xs">{batch.template_name}</span>
              {batch.contest_title && ` · ${batch.contest_title}`} · queued{" "}
              {formatWhen(batch.created_at)}
              {active && " · delivering"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {failed > 0 && (
              <button
                type="button"
                onClick={() => retry(`/api/org/mail/batches/${uid}?action=retry-failed`, "all")}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-slate-900 disabled:opacity-40"
              >
                {busy === "all" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Retry {failed} failed
              </button>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-slate-900"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {batch && (
        <div className="mb-4 flex flex-wrap gap-2">
          {["", "queued", "sent", "failed", "bounced", "complained"].map((s) => {
            const n = s ? (batch.counts[s] ?? 0) : batch.total;
            if (s && n === 0) return null;
            return (
              <button
                key={s || "all"}
                type="button"
                onClick={() => setFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filter === s
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:border-slate-900"
                }`}
              >
                {s || "all"} · {n}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {batch && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Recipient</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Detail</th>
                <th className="px-4 py-2.5">Sent</th>
                <th className="px-4 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.uid}>
                  <td className="px-4 py-2.5">
                    <p className="text-slate-900">{m.to_name || "—"}</p>
                    <p className="font-mono text-xs text-slate-500">{m.to_email}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={m.status} />
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-xs text-slate-600">
                    {m.feedback || m.last_error || (m.attempts > 1 ? `${m.attempts} attempts` : "")}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {m.sent_at ? formatWhen(m.sent_at) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {m.status === "failed" && (
                      <button
                        type="button"
                        onClick={() => retry(`/api/org/mail/messages/${m.uid}?action=retry`, m.uid)}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                      >
                        {busy === m.uid ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nothing matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── templates ─────────────────────────────────────────────────────────────

function Templates() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([
        json<Template[]>(await fetch("/api/org/mail/templates", { cache: "no-store" })),
        json<{ variables: Variable[] }>(
          await fetch("/api/org/mail/templates?variables=1", { cache: "no-store" }),
        ),
      ]);
      setTemplates(t);
      setVariables(v.variables);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load templates.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDefaults() {
    setBusy(true);
    try {
      await json(await fetch("/api/org/mail/templates", { method: "POST" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the defaults.");
    } finally {
      setBusy(false);
    }
  }

  const missingDefaults =
    templates !== null &&
    !["registration-approved", "contest-credentials"].every((n) =>
      templates.some((t) => t.name === n),
    );

  if (editing !== null) {
    return (
      <TemplateEditor
        template={editing === "new" ? null : editing}
        variables={variables}
        onDone={() => {
          setEditing(null);
          void load();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {templates === null
            ? "Loading…"
            : `${templates.length} template${templates.length === 1 ? "" : "s"} · stored in SES, edited here`}
        </p>
        <div className="flex gap-2">
          {missingDefaults && (
            <button
              type="button"
              onClick={createDefaults}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-slate-900 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create the defaults
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New template
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {templates !== null && templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Mail className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">No templates yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Start with the two defaults — the approval notice and the credential email — and edit
            the wording to taste.
          </p>
        </div>
      ) : (
        templates !== null && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Placeholders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <tr
                    key={t.name}
                    onClick={() => setEditing(t)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-900">{t.name}</td>
                    <td className="px-4 py-2.5 text-slate-700">{t.subject}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {t.placeholders.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  variables,
  onDone,
}: {
  template: Template | null;
  variables: Variable[];
  onDone: () => void;
}) {
  const isNew = template === null;
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [text, setText] = useState(template?.text ?? "");
  const [html, setHtml] = useState(template?.html ?? "");
  const [showHtml, setShowHtml] = useState(Boolean(template?.html));
  const [preview, setPreview] = useState<{ subject: string; text: string; html: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<"save" | "preview" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const nameOk = /^[a-z0-9][a-z0-9-]{1,63}$/.test(name);
  const isCredentials = name === "contest-credentials";
  const hasPassphrase = /{{\s*passphrase\s*}}/.test(subject + text + html);

  async function save() {
    setBusy("save");
    setError("");
    try {
      await json(
        await fetch(`/api/org/mail/templates/${name}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, text, html }),
        }),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Preview reflects the *saved* template — SES renders what it holds.
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  async function renderPreview() {
    setBusy("preview");
    setError("");
    try {
      setPreview(
        await json(
          await fetch(`/api/org/mail/templates/${name}?action=preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: {} }),
          }),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not render. Save first?");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete template "${name}"? Sends that name it will fail.`)) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/org/mail/templates/${name}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setBusy(null);
    }
  }

  return (
    <div>
      <button type="button" onClick={onDone} className="mb-4 text-sm text-slate-500 hover:text-slate-900">
        ← All templates
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,380px)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              disabled={!isNew}
              placeholder="schedule-reminder"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-50 disabled:text-slate-500"
            />
            {isNew && name && !nameOk && (
              <span className="mt-1 block text-xs text-red-600">
                Lowercase letters, digits and hyphens, 2–64 characters.
              </span>
            )}
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-slate-700">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-slate-700">Body (plain text)</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              spellCheck
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
            />
          </label>
          {showHtml ? (
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-slate-700">HTML body (optional)</span>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={10}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setShowHtml(true)}
              className="mt-3 text-xs text-slate-500 hover:text-slate-900"
            >
              + Add an HTML version
            </button>
          )}

          {isCredentials && !hasPassphrase && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              The credential template must contain <code className="mx-1">{"{{passphrase}}"}</code>
              — without it nobody can log in.
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy !== null || !nameOk || !subject.trim() || !text.trim() || (isCredentials && !hasPassphrase)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy === "save" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={renderPreview}
              disabled={busy !== null || !nameOk}
              title="Renders the saved version with sample data"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-900 disabled:opacity-40"
            >
              {busy === "preview" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Preview
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={remove}
                disabled={busy !== null}
                className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Placeholders
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Write them as <code>{"{{name}}"}</code>. Sample values are what Preview uses.
            </p>
            <ul className="mt-3 space-y-1.5">
              {variables.map((v) => (
                <li key={v.name} className="flex items-baseline justify-between gap-3 text-xs">
                  <code className="text-slate-900">{`{{${v.name}}}`}</code>
                  <span className="truncate text-slate-500">{v.sample}</span>
                </li>
              ))}
            </ul>
          </div>

          {preview && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{preview.subject}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                {preview.text}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
