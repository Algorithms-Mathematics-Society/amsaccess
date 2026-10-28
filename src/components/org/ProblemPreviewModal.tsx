"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Loader2, FileText, AlertTriangle, Check, Copy } from "lucide-react";
import { useApiQuery } from "@/lib/client/useApiQuery";
import { SkeletonText } from "@/components/org/Skeleton";
import type { Problem, ProblemVersion } from "@/lib/orgTypes";
import {
  getAvailableProblemTabs,
  renderStatementHtml,
  splitProblemDescription,
  TAB_LABELS,
  type ProblemProjection,
  type ProblemSectionKey,
} from "@/lib/problemStatement";

type PreviewResponse = { problem: ProblemProjection; version: number };

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed.");
  return data as T;
}

/**
 * A problem as the candidate will see it, before anyone sits the paper.
 *
 * The tabs and the section split are the proctor's, so what is read here is
 * what appears in the exam. What this deliberately does not show is anything
 * the projection excludes -- tests, checker, reference solution -- because the
 * point is to read the statement a candidate reads, not the pack.
 */
export function ProblemPreviewModal({
  problem,
  initialVersionUid,
  onClose,
}: {
  problem: Problem;
  /** Open on a particular version; defaults to the newest. */
  initialVersionUid?: string;
  onClose: () => void;
}) {
  // Newest first, matching the catalogue card. A problem with no version has
  // nothing to preview and the card does not open this.
  const versions = problem.versions;
  const [versionUid, setVersionUid] = useState(initialVersionUid ?? versions[0]?.uid ?? "");
  const [tab, setTab] = useState<ProblemSectionKey>("statement");
  const [copied, setCopied] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const url = versionUid
    ? `/api/org/problems/${problem.uid}/versions/${versionUid}/preview`
    : "";
  const { data, error } = useApiQuery<PreviewResponse>(
    url,
    () => fetch(url, { cache: "no-store" }).then((res) => json<PreviewResponse>(res)),
    { staleMs: 30_000 },
  );

  const projection = data?.problem;
  const markdown = projection?.statement?.markdown ?? "";

  const sections = useMemo(() => splitProblemDescription(markdown), [markdown]);
  const tabs = useMemo(() => getAvailableProblemTabs(sections), [sections]);
  const bodyHtml = useMemo(() => renderStatementHtml(sections[tab]), [sections, tab]);

  // A statement whose examples live in its own section leaves the previous
  // tab selected when the version changes; fall back rather than render blank.
  useEffect(() => {
    if (!tabs.includes(tab)) setTab("statement");
  }, [tabs, tab]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Sample blocks carry their text on the button, so one handler on the
  // container serves every block without re-binding on each render.
  const onBodyClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-copy-sample]");
    if (!button) return;
    const text = button.getAttribute("data-copy-sample") ?? "";
    const key = button.getAttribute("data-copy-key") ?? "";
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(key);
        window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
      },
      () => undefined,
    );
  }, []);

  const limits = projection?.limits ?? {};
  const wallMs = limits.wall_time_ms ?? 0;
  const memoryMb = limits.memory_mb ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-6"
      onMouseDown={(event) => {
        // Only a press that both starts and ends on the backdrop closes:
        // releasing there after selecting statement text should not.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${problem.title} — candidate preview`}
        className="my-auto w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-950">{problem.title}</h2>
            <p className="mt-0.5 font-mono text-xs text-slate-400">{problem.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            {versions.length > 1 && (
              <select
                value={versionUid}
                onChange={(event) => setVersionUid(event.target.value)}
                aria-label="Version"
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-900"
              >
                {versions.map((v: ProblemVersion) => (
                  <option key={v.uid} value={v.uid}>
                    v{v.version}
                  </option>
                ))}
              </select>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <p className="m-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {!error && data === null && (
          <div className="space-y-3 px-6 py-6">
            <SkeletonText className="w-2/3" />
            <SkeletonText className="w-full" />
            <SkeletonText className="w-5/6" />
          </div>
        )}

        {!error && projection && (
          <>
            <div className="grid grid-cols-3 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <Fact label="Time limit" value={wallMs ? `${wallMs / 1000} s` : "not set"} />
              <Fact label="Memory limit" value={memoryMb ? `${memoryMb} MB` : "not set"} />
              <Fact
                label="Language"
                value={`${projection.language ?? "cpp"} · ${projection.standard ?? "c++23"}`}
              />
            </div>

            {projection.backfilled && (
              <p className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-800">
                Rebuilt from this version&rsquo;s stored columns, because it was uploaded before
                projections existed. Re-upload or reproject it to see exactly what a candidate
                gets.
              </p>
            )}

            {tabs.length > 1 && (
              <div
                role="tablist"
                aria-label="Problem sections"
                className="flex border-b border-slate-200 px-6"
              >
                {tabs.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={
                      tab === key
                        ? "-mb-px border-b-2 border-slate-900 px-4 py-2.5 text-sm font-medium text-slate-900"
                        : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm text-slate-500 transition hover:text-slate-800"
                    }
                  >
                    {TAB_LABELS[key]}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {markdown.trim() ? (
                <div
                  ref={bodyRef}
                  onClick={onBodyClick}
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <div className="py-10 text-center">
                  <FileText className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">No statement stored</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    This version has no statement in its projection. Upload a package built with{" "}
                    <code className="rounded bg-slate-100 px-1">cxxprobe package pack</code>.
                  </p>
                </div>
              )}

              {tab === "statement" && (projection.samples?.length ?? 0) > 0 && (
                <Samples samples={projection.samples ?? []} copied={copied} onCopy={setCopied} />
              )}
            </div>

            <Families families={projection.families} />
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

/**
 * The samples the pack declares, separately from the statement prose.
 *
 * A statement usually writes its examples out as well, but the projection's
 * `samples` are the ones the Run button actually uses, so a mismatch between
 * the two is worth being able to see.
 */
function Samples({
  samples,
  copied,
  onCopy,
}: {
  samples: { input?: string; output?: string; explanation?: string }[];
  copied: string | null;
  onCopy: (key: string | null) => void;
}) {
  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Sample cases ({samples.length}) &middot; what Run uses
      </p>
      <div className="space-y-3">
        {samples.map((sample, index) => (
          <div key={index} className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
              <span className="text-xs font-medium text-slate-600">Sample {index + 1}</span>
              <button
                type="button"
                onClick={() => {
                  const key = `sample-pair-${index}`;
                  void navigator.clipboard
                    ?.writeText(sample.input ?? "")
                    .then(() => {
                      onCopy(key);
                      window.setTimeout(() => onCopy(null), 1500);
                    }, () => undefined);
                }}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                {copied === `sample-pair-${index}` ? (
                  <>
                    <Check className="h-3 w-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy input
                  </>
                )}
              </button>
            </div>
            <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
              <Pane label="Input" body={sample.input ?? ""} />
              <Pane label="Output" body={sample.output ?? ""} />
            </div>
            {sample.explanation && (
              <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
                {sample.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Pane({ label, body }: { label: string; body: string }) {
  return (
    <div className="bg-white px-3 py-2">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
        {body || "(empty)"}
      </pre>
    </div>
  );
}

/**
 * How the problem is graded, in the candidate's terms.
 *
 * The symbolic family is a gate rather than a score, and a candidate who
 * believes it is worth points will trade it against the others -- so whether
 * a family is graded is shown, not just that it exists.
 */
function Families({ families }: { families: ProblemProjection["families"] }) {
  const entries = Object.entries(families ?? {}).filter(
    ([, value]) => (value?.count ?? 0) > 0 || value?.present,
  );
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-200 bg-slate-50 px-6 py-3">
      {entries.map(([kind, value]) => (
        <span key={kind} className="text-xs text-slate-600">
          <span className="font-medium capitalize text-slate-800">{kind}</span>{" "}
          {value?.count ?? 0} {value?.count === 1 ? "case" : "cases"}
          {value?.graded === false && (
            <span className="ml-1 rounded bg-slate-200 px-1 py-0.5 text-[10px] text-slate-600">
              not scored
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
