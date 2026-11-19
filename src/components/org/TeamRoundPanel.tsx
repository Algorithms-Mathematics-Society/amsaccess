"use client";

import { useEffect, useRef, useState } from "react";
import { useOrgRole } from "@/lib/client/useOrgRole";
import {
  PROJECT_LIMIT,
  TEAM_WRITERS,
  parseDrawPreview,
  parseProjectCatalog,
  validateTeamBody,
  type CatalogProject,
  type DrawPreview,
} from "@/lib/teamSetup";
import { parseTeamRoster, type MonitorTeam } from "@/lib/teamMonitor";
import { TeamRoundMonitor } from "./TeamRoundMonitor";

type Round = {
  team_size: number;
  discussion_seconds: number;
  selection_opens_at: string | null;
  allocation_locks_at: string | null;
  submit_deadline: string | null;
  seeded_at: string | null;
  published_at: string | null;
  allocation_locked_at: string | null;
  rank_sum_spread: number | null;
  project: { uid: string; name: string } | null;
  parts: { label: string }[];
  benchmark?: { enabled: boolean; input_sha256: string | null };
};
type BenchmarkRun = {
  uid: string;
  team: string;
  revision: number;
  status: string;
  median_ns: number | null;
  input_sha256: string | null;
  completed_at: string | null;
};
type Preview = {
  name: string;
  parts: { label: string; title: string; warnings: string[] }[];
};
const input =
  "mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900";
const button =
  "rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50";
function localTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function TeamRoundPanel({
  contestUid,
  onChanged,
  contestStartsAt = null,
  contestEndsAt = null,
  notificationsEnabled = false,
}: {
  contestUid: string;
  onChanged: () => void;
  contestStartsAt?: string | null;
  contestEndsAt?: string | null;
  notificationsEnabled?: boolean;
}) {
  const { role, known } = useOrgRole();
  const canWrite = known && role !== null && TEAM_WRITERS.includes(role);
  const [round, setRound] = useState<Round | null>(null);
  const [teams, setTeams] = useState<MonitorTeam[]>([]);
  const [rosterError, setRosterError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [project, setProject] = useState("");
  const [projects, setProjects] = useState<CatalogProject[]>([]);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [size, setSize] = useState(4);
  const [discussion, setDiscussion] = useState(120);
  const [opens, setOpens] = useState("");
  const [locks, setLocks] = useState("");
  const [deadline, setDeadline] = useState("");
  const [source, setSource] = useState(contestUid);
  const [take, setTake] = useState(4);
  const [method, setMethod] = useState("snake");
  const [bands, setBands] = useState(4);
  const [additions, setAdditions] = useState("");
  const [drawPreview, setDrawPreview] = useState<{
    body: Record<string, unknown>;
    plan: DrawPreview;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [imported, setImported] = useState(false);
  const [benchFile, setBenchFile] = useState<File | null>(null);
  const [runs, setRuns] = useState<BenchmarkRun[] | null>(null);
  const controller = useRef<AbortController | null>(null);
  const flight = useRef(false);
  const mounted = useRef(true);
  const base = `/api/org/contests/${encodeURIComponent(contestUid)}/team-round`;

  async function request(path: string, init: RequestInit = {}, absent = false) {
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(
      () => abort.abort(),
      init.body instanceof FormData ? 125000 : 30000,
    );
    try {
      const response = await fetch(path, {
        ...init,
        cache: "no-store",
        signal: abort.signal,
      });
      const data = await response.json();
      if (absent && response.status === 404) return null;
      if (!response.ok)
        throw new Error(
          data.error ?? data.detail ?? `Request failed (${response.status}).`,
        );
      return data;
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) controller.current = null;
    }
  }
  async function load() {
    setDrawPreview(null);
    const state = (await request(base, {}, true)) as Round | null;
    if (!mounted.current) return;
    setRound(state);
    if (state) {
      setProject(state.project?.uid ?? "");
      setSize(state.team_size);
      setDiscussion(state.discussion_seconds);
      setOpens(localTime(state.selection_opens_at));
      setLocks(localTime(state.allocation_locks_at));
      setDeadline(localTime(state.submit_deadline));
      let roster: MonitorTeam[] = [];
      let problem = "";
      try {
        roster = parseTeamRoster(await request(base + "/teams"));
      } catch (e) {
        problem =
          e instanceof Error
            ? e.message
            : "The team roster response was not recognised. Refresh, or report this.";
      }
      if (mounted.current) {
        setTeams(roster);
        setRosterError(problem);
      }
      const history = await request(base + "/benchmarks").catch(() => null);
      if (mounted.current) setRuns(Array.isArray(history) ? history : null);
    } else {
      setTeams([]);
      setRosterError("");
      setRuns(null);
    }
    if (mounted.current) setLoaded(true);
  }
  async function refresh() {
    await load();
    if (!mounted.current) return;
    try {
      const catalog = parseProjectCatalog(await request("/api/org/projects"));
      if (mounted.current) {
        setProjects(catalog);
        setCatalogUnavailable(false);
      }
    } catch {
      if (mounted.current) setCatalogUnavailable(true);
    }
  }
  async function action(work: () => Promise<void>, mutation = false) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (mounted.current)
        setError(
          (e instanceof Error ? e.message : "Request failed.") +
            (mutation
              ? " If the connection failed, refresh state before trying again; delivery may have succeeded."
              : ""),
        );
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const start = setTimeout(() => {
      void action(refresh);
    }, 0);
    return () => {
      clearTimeout(start);
      mounted.current = false;
      controller.current?.abort();
    };
    // Parent keys the panel by contest; no background polling or mutation retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const frozen = Boolean(round?.seeded_at);
  const hasClaims = teams.some((t) => t.members.some((m) => m.part_label));
  const allocationLocked = Boolean(
    round?.allocation_locked_at ||
      (round?.allocation_locks_at &&
        Date.parse(round.allocation_locks_at) <= Date.now()),
  );
  const drawBlocked = Boolean(
    round?.published_at ||
      hasClaims ||
      rosterError ||
      (frozen && allocationLocked),
  );
  const projectPartCount = projects.find(
    (item) => item.uid === project,
  )?.part_count;
  async function mutate(
    suffix: string,
    body?: Record<string, unknown>,
    verb = "POST",
  ) {
    await request(base + suffix, {
      method: verb,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    await load();
    if (mounted.current) {
      setNotice("Saved.");
      onChanged();
    }
  }
  return (
    <section className="space-y-6 p-6" aria-label="Team round setup">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team round</h2>
          <p className="text-sm text-slate-600">
            Import a project, configure the round, then review and publish
            teams.
          </p>
        </div>
        <button
          className={button}
          disabled={busy}
          onClick={() => void action(refresh)}
        >
          Refresh state
        </button>
      </div>
      {!canWrite && (
        <p role="status" className="rounded bg-amber-50 p-3 text-sm">
          {known
            ? "Your role cannot change team rounds or import projects, including practice rounds. Ask an authorized organizer. These new organizer controls require a non-intern staff role."
            : "Checking your organization role…"}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-green-800">
          {notice}
        </p>
      )}
      {busy && <p role="status">Working…</p>}
      {!loaded && !busy && (
        <p>Could not load team settings. Refresh before making changes.</p>
      )}
      {round?.published_at && (
        <TeamRoundMonitor
          base={base}
          contestUid={contestUid}
          notificationsEnabled={notificationsEnabled}
          schedule={{
            selection_opens_at: round.selection_opens_at,
            discussion_seconds: round.discussion_seconds,
            allocation_locks_at: round.allocation_locks_at,
            allocation_locked_at: round.allocation_locked_at,
            submit_deadline: round.submit_deadline,
            contest_starts_at: contestStartsAt,
            contest_ends_at: contestEndsAt,
          }}
        />
      )}
      <fieldset
        disabled={!canWrite || busy || !loaded}
        className="space-y-4 rounded border p-4"
      >
        <legend className="px-2 font-semibold">1. Project pack</legend>
        <p className="text-sm text-slate-600">
          Preview a .cxxpkg before importing (maximum 32 MiB). Importing adds it
          to the organization catalog; binding it below replaces this contest’s
          existing team parts.
        </p>
        <label className="block text-sm">
          Package
          <input
            className={input}
            type="file"
            accept=".cxxpkg"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setImported(false);
            }}
          />
        </label>
        <button
          className={button}
          disabled={!file || imported}
          onClick={() =>
            void action(async () => {
              if (!file || file.size > PROJECT_LIMIT || !file.size)
                throw new Error("Choose a package up to 32 MiB.");
              const form = new FormData();
              form.set("package", file);
              const result = await request("/api/org/projects/inspect", {
                method: "POST",
                body: form,
              });
              if (mounted.current) setPreview(result);
            })
          }
        >
          Inspect package
        </button>
        {preview && (
          <div>
            <h3 className="font-medium">{preview.name}</h3>
            <ul className="list-disc pl-5">
              {preview.parts.map((p) => (
                <li key={p.label}>
                  {p.label}: {p.title}
                  {p.warnings?.map((w, i) => (
                    <p className="text-amber-800" key={i}>
                      {w}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
            <button
              className={button}
              disabled={imported}
              onClick={() =>
                void action(async () => {
                  if (
                    !file ||
                    !window.confirm(
                      `Import ${preview.name} into the organization catalog?`,
                    )
                  )
                    return;
                  const form = new FormData();
                  form.set("package", file);
                  const result = await request("/api/org/projects", {
                    method: "POST",
                    body: form,
                  });
                  if (mounted.current) {
                    const [added] = parseProjectCatalog([
                      {
                        uid: result?.uid,
                        name: preview.name,
                        part_count: preview.parts.length,
                      },
                    ]);
                    setProjects((prior) => [
                      ...prior.filter((item) => item.uid !== added.uid),
                      added,
                    ]);
                    if (!frozen) {
                      setProject(added.uid);
                      setSize(added.part_count);
                    }
                    setImported(true);
                    setNotice(
                      frozen
                        ? "Project imported into the organization catalog."
                        : "Project imported. Save round settings to attach it.",
                    );
                  }
                }, true)
              }
            >
              {imported ? "Imported" : "Import project"}
            </button>
          </div>
        )}
        {catalogUnavailable ? (
          <label className="block text-sm">
            Project UID
            <input
              className={input}
              value={project}
              onChange={(e) => setProject(e.target.value.trim())}
              disabled={frozen}
              aria-describedby="team-project-catalog-error"
            />
            <span
              id="team-project-catalog-error"
              className="block text-slate-600"
            >
              The project catalog could not load. Refresh state or enter an
              existing project UID.
            </span>
          </label>
        ) : (
          <label className="block text-sm">
            Imported project
            <select
              className={input}
              value={project}
              disabled={frozen}
              onChange={(e) => {
                const uid = e.target.value;
                setProject(uid);
                const selected = projects.find((item) => item.uid === uid);
                if (selected) setSize(selected.part_count);
              }}
            >
              <option value="">
                {projects.length ? "Choose a project" : "No imported projects"}
              </option>
              {round?.project &&
                !projects.some((item) => item.uid === round.project?.uid) && (
                  <option value={round.project.uid}>
                    {round.project.name} (current project)
                  </option>
                )}
              {projects.map((item) => (
                <option key={item.uid} value={item.uid}>
                  {item.name} ({item.part_count}{" "}
                  {item.part_count === 1 ? "part" : "parts"})
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            const body: Record<string, unknown> = {
              project_uid: project,
              team_size: size,
              discussion_seconds: discussion,
            };
            for (const [key, value] of [
              ["selection_opens_at", opens],
              ["allocation_locks_at", locks],
              ["submit_deadline", deadline],
            ])
              if (value) body[key] = new Date(value).toISOString();
            validateTeamBody("", body);
            if (projectPartCount !== undefined && projectPartCount !== size)
              throw new Error(
                "Team size must equal the selected project’s number of parts.",
              );
            if (
              !window.confirm(
                "Save these team settings? Binding a different project replaces existing team parts.",
              )
            )
              return;
            await mutate("", body, "PUT");
          }, true);
        }}
      >
        <fieldset
          disabled={!canWrite || busy || !loaded}
          className="rounded border p-4"
        >
          <legend className="px-2 font-semibold">
            2. Settings and timeline
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              Team size
              <input
                className={input}
                type="number"
                min="1"
                max="5"
                required
                disabled={frozen}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
            <label>
              Discussion seconds
              <input
                className={input}
                type="number"
                min="0"
                max="3600"
                required
                value={discussion}
                onChange={(e) => setDiscussion(Number(e.target.value))}
              />
            </label>
            <label>
              Lobby opens (your local time)
              <input
                className={input}
                type="datetime-local"
                value={opens}
                onChange={(e) => setOpens(e.target.value)}
              />
            </label>
            <label>
              Allocation locks (your local time)
              <input
                className={input}
                type="datetime-local"
                value={locks}
                onChange={(e) => setLocks(e.target.value)}
              />
            </label>
            <label>
              Submission deadline (your local time)
              <input
                className={input}
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
          </div>
          <p className="my-3 text-sm text-slate-600">
            Lobby opens → discussion ({discussion}s) → choose parts → allocation
            locks → submission deadline. Blank dates retain existing/default
            values. Team size is limited to the desktop client’s supported
            maximum of five.
          </p>
          <button className={button} type="submit">
            Save settings
          </button>
        </fieldset>
      </form>
      <fieldset
        disabled={!canWrite || busy || !loaded || !round}
        onChangeCapture={() => setDrawPreview(null)}
        className="space-y-4 rounded border p-4"
      >
        <legend className="px-2 font-semibold">3. Draw teams</legend>
        <p className="text-sm">
          Preview a draw before saving teams. Participants need credentials
          through the Participants tab.
        </p>
        <label className="block">
          Source contest UID
          <input
            className={input}
            value={source}
            onChange={(e) => setSource(e.target.value.trim())}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            Top-ranked count
            <input
              className={input}
              type="number"
              min="1"
              max="2000"
              value={take}
              onChange={(e) => setTake(Number(e.target.value))}
            />
          </label>
          <label>
            Method
            <select
              className={input}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="snake">Snake — balanced across ranks</option>
              <option value="tiered">Tiered — consecutive ranks</option>
              <option value="banded">Banded — balanced within tiers</option>
            </select>
          </label>
          {method === "banded" && (
            <label>
              Bands
              <input
                className={input}
                type="number"
                min="1"
                max="50"
                value={bands}
                onChange={(e) => setBands(Number(e.target.value))}
              />
            </label>
          )}
        </div>
        <label className="block">
          Additional participant user UIDs (one per line, maximum 100)
          <textarea
            className={input}
            value={additions}
            onChange={(e) => setAdditions(e.target.value)}
          />
        </label>
        <button
          className={button}
          disabled={drawBlocked}
          onClick={() =>
            void action(async () => {
              const body = validateTeamBody("/seed", {
                source_contest_uid: source,
                take,
                method,
                bands,
                add_user_uids: additions.split(/\s+/).filter(Boolean),
                reset: Boolean(round?.seeded_at),
              });
              setDrawPreview(null);
              const plan = parseDrawPreview(
                await request(base + "/seed/preview", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }),
              );
              if (mounted.current) setDrawPreview({ body, plan });
            })
          }
        >
          {round?.seeded_at ? "Preview redraw" : "Preview draw"}
        </button>
        {drawPreview && (
          <section
            className="space-y-2 rounded border p-3"
            aria-label="Draw preview"
          >
            <h4 className="font-medium">Proposed teams</h4>
            <p>
              {drawPreview.plan.team_list.length} teams · Rank-sum spread:{" "}
              {drawPreview.plan.rank_sum_spread}
            </p>
            <p className="text-sm text-slate-600">
              Saving recalculates the draw from the live source standings. If
              standings change after this preview, the saved teams can differ.
              Review the saved roster before publishing.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {drawPreview.plan.team_list.map((team, index) => (
                <article key={team.number}>
                  <h5 className="font-medium">
                    {team.name} · Rank sum {drawPreview.plan.rank_sums[index]}
                  </h5>
                  <ul>
                    {team.members.map((member) => (
                      <li key={member.user_uid}>
                        {member.display_name || member.username} · Rank{" "}
                        {member.seed_rank}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <button
              className={button}
              disabled={drawBlocked}
              onClick={() =>
                void action(async () => {
                  if (
                    !window.confirm(
                      round?.seeded_at
                        ? "Replace the unpublished draw using the current source standings?"
                        : "Save teams using the current source standings?",
                    )
                  )
                    return;
                  setDrawPreview(null);
                  await mutate("/seed", drawPreview.body);
                }, true)
              }
            >
              {round?.seeded_at ? "Save redraw" : "Save draw"}
            </button>
          </section>
        )}
      </fieldset>
      <div className="space-y-3 rounded border p-4">
        <h3 className="font-semibold">4. Review and publish</h3>
        {rosterError && (
          <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
            {rosterError}
          </p>
        )}
        <p>
          {rosterError ? "Roster not available" : `${teams.length} teams`} ·
          Rank-sum spread: {round?.rank_sum_spread ?? "not available"} ·{" "}
          {round?.published_at ? "Teams published" : "Teams unpublished"}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((t) => (
            <article className="rounded border p-3" key={t.uid}>
              <h4 className="font-medium">
                {t.name} · Rank sum{" "}
                {t.members.every((m) => m.seed_rank !== null)
                  ? t.members.reduce((sum, m) => sum + (m.seed_rank ?? 0), 0)
                  : "not available"}
              </h4>
              <ul>
                {t.members.map((m) => (
                  <li key={m.user_uid}>
                    {m.display_name} · Rank {m.seed_rank ?? "not available"} ·
                    Part {m.part_label ?? "not chosen"}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className={button}
            disabled={
              !canWrite || busy || !teams.length || Boolean(round?.published_at)
            }
            onClick={() =>
              void action(async () => {
                if (
                  window.confirm(
                    "Publish these teams to participants? Teams can only be unpublished before any part is claimed or allocation is locked.",
                  )
                )
                  await mutate("/publish");
              }, true)
            }
          >
            Publish teams
          </button>
          {round?.published_at && (
            <button
              className={button}
              disabled={
                !canWrite ||
                busy ||
                hasClaims ||
                allocationLocked ||
                Boolean(rosterError)
              }
              onClick={() =>
                void action(async () => {
                  if (
                    window.confirm(
                      "Hide the team lobby from participants? The saved draw and participant roster will remain.",
                    )
                  )
                    await mutate("/unpublish");
                }, true)
              }
            >
              Unpublish teams
            </button>
          )}
          <button
            className={button}
            disabled={
              !canWrite ||
              busy ||
              !round?.published_at ||
              Boolean(round?.allocation_locked_at)
            }
            onClick={() =>
              void action(async () => {
                if (
                  window.confirm(
                    "Lock allocation now and assign all remaining parts? This closes participant choices.",
                  )
                )
                  await mutate("/lock-allocation");
              }, true)
            }
          >
            Lock allocation now
          </button>
          <a className={button} href="#participants">
            Participant credentials
          </a>
        </div>
        {round?.published_at && (hasClaims || allocationLocked) && (
          <p className="text-sm text-slate-600">
            Teams can only be unpublished before any part is claimed or
            allocation is locked.
          </p>
        )}
        <p className="text-sm text-slate-600">
          Publishing teams does not publish the contest. Use the contest’s
          Publish control separately after checking settings and credentials.
          Voice also requires configured TURN infrastructure.
        </p>
      </div>
      <fieldset
        disabled={!canWrite || busy || !loaded || !round}
        className="space-y-4 rounded border p-4"
      >
        <legend className="px-2 font-semibold">
          5. Hidden benchmark input
        </legend>
        <p className="text-sm text-slate-600">
          Benchmark results rank only once they were measured on this exact
          input (maximum 32 MiB).
        </p>
        <p className="text-sm">
          Stored input SHA-256:{" "}
          <code className="break-all">
            {round?.benchmark?.input_sha256 ?? "none uploaded"}
          </code>
        </p>
        <label className="block text-sm">
          Input file
          <input
            key={round?.benchmark?.input_sha256 ?? ""}
            className={input}
            type="file"
            onChange={(e) => setBenchFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          className={button}
          disabled={!benchFile}
          onClick={() =>
            void action(async () => {
              if (
                !benchFile ||
                !benchFile.size ||
                benchFile.size > PROJECT_LIMIT
              )
                throw new Error("Choose a nonempty input up to 32 MiB.");
              if (
                !window.confirm(
                  round?.benchmark?.input_sha256
                    ? "Replace the hidden benchmark input? Only results measured on the new input will rank."
                    : "Upload this hidden benchmark input? Only results measured on it will rank.",
                )
              )
                return;
              const form = new FormData();
              form.set("input", benchFile);
              const result = await request(base + "/benchmark-input", {
                method: "POST",
                body: form,
              });
              await load();
              if (mounted.current) {
                setBenchFile(null);
                setNotice(`Benchmark input stored (SHA-256 ${result.sha256}).`);
                onChanged();
              }
            }, true)
          }
        >
          Upload benchmark input
        </button>
        <h3 className="font-medium">Benchmark runs</h3>
        {runs === null ? (
          <p className="text-sm text-slate-600">
            Benchmark runs not available.
          </p>
        ) : !runs.length ? (
          <p className="text-sm text-slate-600">No benchmark runs yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {runs.map((r) => (
              <li key={r.uid}>
                {r.team} · Revision {r.revision} · {r.status} ·{" "}
                {r.median_ns === null
                  ? "no median"
                  : `${(r.median_ns / 1e6).toFixed(3)} ms median`}{" "}
                ·{" "}
                {r.input_sha256 &&
                r.input_sha256 === round?.benchmark?.input_sha256
                  ? "current input"
                  : "other input"}
                {r.completed_at
                  ? ` · ${new Date(r.completed_at).toLocaleString()}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </section>
  );
}
