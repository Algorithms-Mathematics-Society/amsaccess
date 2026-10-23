"use client";

import { useEffect, useRef, useState } from "react";
import type { ReferenceSheetState } from "@/lib/referenceSheet";
import { validateReferenceSheetRequest } from "@/lib/referenceSheet";
import { formatWhen } from "@/lib/orgTypes";
import { guardReferenceSheetNavigation } from "@/lib/client/referenceSheetNavigation";

export function ReferenceSheetEditor({
  contestUid,
  active,
  startsAt,
  isPractice,
}: {
  contestUid: string;
  active: boolean;
  startsAt: string;
  isPractice: boolean;
}) {
  const [sheet, setSheet] = useState<ReferenceSheetState | null>(null);
  const [title, setTitle] = useState("Reference sheet");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<"draft" | "published" | null>(null);
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  const requested = useRef(false);
  const loaded = useRef(false);
  const dirty =
    !!sheet && (title !== sheet.draft.title || body !== sheet.draft.body);
  const path = `/api/org/contests/${encodeURIComponent(contestUid)}/reference-sheet`;

  useEffect(() => {
    if (!active || requested.current || loaded.current) return;
    requested.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort("timeout"),
      25_000,
    );
    setBusy(true);
    setError("");
    fetch(path, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not load the reference sheet.");
        if (controller.signal.aborted) return;
        loaded.current = true;
        setSheet(data);
        setTitle(data.draft.title);
        setBody(data.draft.body);
      })
      .catch((err) => {
        if (controller.signal.reason === "timeout")
          setError(
            "Loading timed out. Retry when your connection is available.",
          );
        else if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the reference sheet.",
          );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (
          !controller.signal.aborted ||
          controller.signal.reason === "timeout"
        )
          setBusy(false);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      requested.current = false;
    };
  }, [active, path, reload]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const guardLink = (event: MouseEvent) =>
      guardReferenceSheetNavigation(event, window.location.href, () =>
        window.confirm(
          "Leave this page and discard your unsaved reference sheet changes?",
        ),
      );
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty]);

  async function save(publish: boolean) {
    if (!sheet || pending.current) return;
    const input = publish
      ? { version: sheet.draft.version }
      : { title, body, version: sheet.draft.version };
    const validation = validateReferenceSheetRequest(input, publish);
    if (validation) {
      setError(validation);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(`${path}${publish ? "/publish" : ""}`, {
        method: publish ? "POST" : "PUT",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ||
            "The change could not be confirmed. Reload the saved sheet before trying again.",
        );
      setSheet(data);
      setTitle(data.draft.title);
      setBody(data.draft.body);
      setNotice(
        publish
          ? `Published revision ${data.published.revision}. Candidates will receive this sheet when they enter the contest.`
          : "Draft saved. Candidates cannot see these changes until you publish.",
      );
    } catch (err) {
      setError(
        controller.signal.aborted
          ? "The request timed out. The change may have been saved; reload the saved sheet before trying again."
          : err instanceof Error
            ? err.message
            : "The change could not be confirmed. Reload the saved sheet before trying again.",
      );
    } finally {
      window.clearTimeout(timeout);
      pending.current = false;
      setBusy(false);
    }
  }

  const locked = !isPractice && Date.now() >= new Date(startsAt).getTime();
  const alreadyPublished =
    !!sheet?.published &&
    sheet.published.title === title &&
    sheet.published.body === body;
  const control =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-50";

  return (
    <section
      hidden={!active}
      aria-labelledby="reference-editor-heading"
      className="space-y-4"
    >
      <div>
        <h2
          id="reference-editor-heading"
          className="text-lg font-semibold text-slate-950"
        >
          Candidate reference sheet
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          One read-only sheet for everyone in this contest. Use plain text, line
          breaks, and bullet characters; links and HTML are not interactive.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <p role="status" className="text-sm text-slate-600">
        {busy ? "Saving or loading reference sheet…" : notice}
      </p>
      {!sheet ? (
        <button
          type="button"
          className={control}
          disabled={busy}
          onClick={() => {
            loaded.current = false;
            requested.current = false;
            setReload((value) => value + 1);
          }}
        >
          Retry loading
        </button>
      ) : (
        <>
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {sheet.published
              ? `Published revision ${sheet.published.revision} · ${formatWhen(sheet.published.published_at)}`
              : "Not published. Candidates do not have a reference sheet yet."}
            {dirty ? " · Unsaved changes" : " · Draft saved"}
          </p>
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="reference-title"
          >
            Sheet title
          </label>
          <input
            id="reference-title"
            value={title}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
            className={`${control} w-full`}
            aria-describedby="reference-limits"
          />
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="reference-body"
          >
            Helping points
          </label>
          <textarea
            id="reference-body"
            rows={14}
            value={body}
            disabled={busy}
            onChange={(event) => setBody(event.target.value)}
            className={`${control} w-full resize-y leading-relaxed`}
            aria-describedby="reference-limits"
          />
          <p id="reference-limits" className="text-xs text-slate-500">
            Title: {Array.from(title).length}/120 characters. Sheet:{" "}
            {Array.from(body).length.toLocaleString()}/20,000 characters.
          </p>
          <p className="text-sm text-slate-600">
            {locked
              ? "Publication is locked because the contest has started. You can still save draft edits; candidates will not receive them."
              : isPractice
                ? "Practice sheets can be updated. Candidates already inside keep the revision they loaded."
                : "Publish before the contest starts. Publication locks at the start so everyone receives the same guidance."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={control}
              disabled={busy || !dirty}
              onClick={() => void save(false)}
            >
              Save draft
            </button>
            <button
              type="button"
              className={control}
              aria-expanded={preview === "draft"}
              aria-controls="reference-preview"
              onClick={() =>
                setPreview((value) => (value === "draft" ? null : "draft"))
              }
            >
              {preview === "draft"
                ? "Hide draft preview"
                : "Preview draft as candidate"}
            </button>
            <button
              type="button"
              className={`${control} font-semibold`}
              disabled={
                busy ||
                locked ||
                dirty ||
                !body.trim() ||
                !title.trim() ||
                alreadyPublished
              }
              onClick={() => void save(true)}
            >
              Publish saved draft
            </button>
            {sheet.published && (
              <button
                type="button"
                className={control}
                aria-expanded={preview === "published"}
                aria-controls="reference-preview"
                onClick={() =>
                  setPreview((value) =>
                    value === "published" ? null : "published",
                  )
                }
              >
                {preview === "published"
                  ? "Hide published sheet"
                  : "View published sheet"}
              </button>
            )}
            {error && (
              <button
                type="button"
                className={control}
                disabled={busy}
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm(
                      "Discard your unsaved changes and reload the saved sheet?",
                    )
                  )
                    return;
                  loaded.current = false;
                  requested.current = false;
                  setReload((value) => value + 1);
                }}
              >
                Reload saved sheet
              </button>
            )}
          </div>
          {dirty && (
            <p className="text-sm text-slate-600">
              Save your changes before publishing.
            </p>
          )}
          {preview && (
            <article
              id="reference-preview"
              aria-label="Candidate content preview"
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <p className="mb-3 text-xs text-slate-500">
                Content preview ·{" "}
                {preview === "published"
                  ? `Published revision ${sheet.published?.revision}`
                  : dirty
                    ? "Includes unsaved changes"
                    : "Saved draft"}
              </p>
              <h3 className="break-words [overflow-wrap:anywhere] text-xl font-semibold text-slate-950">
                {(preview === "published" ? sheet.published?.title : title) ||
                  "Reference sheet"}
              </h3>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
                {(preview === "published" ? sheet.published?.body : body) ||
                  "Your helping points will appear here."}
              </p>
            </article>
          )}
        </>
      )}
    </section>
  );
}
