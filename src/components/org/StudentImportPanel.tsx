"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  STUDENT_IMPORT_FIELDS,
  MAX_STUDENT_IMPORT_BYTES,
  studentCsvHeaders,
  studentImportResult,
  importErrorsCsv,
  type StudentImportResult,
} from "@/lib/studentImport";

export function StudentImportPanel({
  onDone,
  onImported,
}: {
  onDone: () => void;
  onImported: () => void;
}) {
  const [source, setSource] = useState<{
    file: File;
    headers: string[];
  } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<StudentImportResult | null>(null);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [busy, setBusy] = useState<"read" | "preview" | "commit" | null>(null);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const operation = useRef(0);
  const inFlight = useRef(false);
  useEffect(
    () => () => {
      operation.current++;
    },
    [],
  );

  async function choose(file: File) {
    const current = ++operation.current;
    setBusy("read");
    setError("");
    setSource(null);
    setPreview(null);
    setResult(null);
    setUncertain(false);
    try {
      if (file.size > MAX_STUDENT_IMPORT_BYTES)
        throw new Error("Choose a CSV file of 10 MiB or less.");
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        );
      } catch {
        throw new Error("Save the file as UTF-8 CSV and choose it again.");
      }
      const headers = studentCsvHeaders(text);
      if (current !== operation.current) return;
      const initial: Record<string, string> = {};
      for (const [field] of STUDENT_IMPORT_FIELDS) {
        const matches = headers.filter(
          (header) => header.trim().toLowerCase() === field,
        );
        if (matches.length === 1) initial[field] = matches[0];
      }
      setMapping(initial);
      setSource({ file, headers });
    } catch (err) {
      if (current === operation.current)
        setError(
          err instanceof Error ? err.message : "Could not read the file.",
        );
    } finally {
      if (current === operation.current) setBusy(null);
    }
  }

  async function request(commit: boolean) {
    if (
      !source ||
      !mapping.display_name ||
      inFlight.current ||
      (commit && !preview?.preview_token)
    )
      return;
    inFlight.current = true;
    const current = ++operation.current;
    setBusy(commit ? "commit" : "preview");
    setError("");
    let outcomeKnown = !commit;
    try {
      const form = new FormData();
      form.append("file", source.file);
      form.append(
        "mapping",
        JSON.stringify(
          Object.fromEntries(
            Object.entries(mapping).filter(([, header]) => header),
          ),
        ),
      );
      if (commit) form.append("preview_token", preview!.preview_token!);
      const response = await fetch(
        `/api/org/students/import/${commit ? "commit" : "preview"}`,
        { method: "POST", body: form },
      );
      if (!response.ok && response.status < 500 && response.status !== 408)
        outcomeKnown = true;
      const data: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          typeof (data as { error?: unknown })?.error === "string"
            ? (data as { error: string }).error
            : "The import request failed.",
        );
      const next = studentImportResult(data, !commit);
      outcomeKnown = true;
      if (current !== operation.current) return;
      if (commit) {
        setResult(next);
        setPreview(null);
        onImported();
      } else setPreview(next);
    } catch (err) {
      if (current !== operation.current) return;
      setPreview(null);
      setError(
        err instanceof Error ? err.message : "The import request failed.",
      );
      if (!outcomeKnown) setUncertain(true);
    } finally {
      inFlight.current = false;
      if (current === operation.current) setBusy(null);
    }
  }

  function downloadErrors(report: StudentImportResult) {
    const url = URL.createObjectURL(
      new Blob([importErrorsCsv(report.row_errors)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-import-errors.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const report = result ?? preview;
  return (
    <section
      aria-labelledby="student-import-title"
      className="mb-4 min-w-0 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2
        id="student-import-title"
        className="text-sm font-medium text-slate-800"
      >
        Import students from CSV
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Choose a file, match its columns, then preview before importing. Names
        are required. Email lets students receive their login; external
        reference, then email, identifies existing students to update.
      </p>
      <a
        href="/api/org/students/import/template.csv"
        download="students-template.csv"
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-700 underline"
      >
        <Download className="h-3.5 w-3.5" />
        Download template
      </a>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={Boolean(busy) || uncertain}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void choose(file);
          }}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-slate-700"
        />
      </label>
      {source && !result && !uncertain && (
        <>
          <p className="mt-4 text-sm text-slate-700">
            Match columns in <strong>{source.file.name}</strong>. Unmapped
            columns are ignored.
          </p>
          <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {STUDENT_IMPORT_FIELDS.map(([field, label]) => (
              <label key={field} className="min-w-0 text-sm text-slate-700">
                {label}
                <select
                  aria-label={label}
                  value={mapping[field] ?? ""}
                  disabled={Boolean(busy)}
                  onChange={(event) => {
                    setMapping((previous) => ({
                      ...previous,
                      [field]: event.target.value,
                    }));
                    setPreview(null);
                    setError("");
                  }}
                  className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="">
                    {field === "display_name"
                      ? "Choose a column"
                      : "Do not import"}
                  </option>
                  {source.headers.map((header) => (
                    <option
                      key={header}
                      value={header}
                      disabled={Object.entries(mapping).some(
                        ([other, chosen]) =>
                          other !== field && chosen === header,
                      )}
                    >
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void request(false)}
            disabled={Boolean(busy) || !mapping.display_name}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800 disabled:opacity-40"
          >
            Preview import
          </button>
        </>
      )}
      {busy && (
        <p
          role="status"
          className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {busy === "read"
            ? "Reading file…"
            : busy === "preview"
              ? "Checking rows without importing…"
              : "Importing… Keep this page open."}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {uncertain && (
        <div className="mt-3 text-sm text-amber-800">
          <p>
            The request may have completed. Review the directory before trying
            again to avoid duplicate students.
          </p>
          <button
            type="button"
            onClick={() => {
              onImported();
              onDone();
            }}
            className="mt-2 rounded-lg border border-amber-700 px-3 py-2 font-medium"
          >
            Review directory
          </button>
        </div>
      )}
      {report && (
        <div
          className="mt-5 border-t border-slate-200 pt-4"
          aria-label={result ? "Import result" : "Import preview"}
        >
          <h3 className="text-sm font-semibold text-slate-900">
            {result ? "Import complete" : "Preview — nothing imported yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            {report.total_rows} rows · {report.created}{" "}
            {result ? "added" : "to add"} · {report.updated}{" "}
            {result ? "updated" : "to update"} · {report.skipped} skipped
          </p>
          {report.error_count > 0 && (
            <div className="mt-3 text-sm text-amber-800">
              <p>
                {report.error_count} field errors. Rows without a name are
                skipped; other valid fields can still be imported. Review the
                errors before continuing.
              </p>
              <ul className="mt-2 list-disc pl-5">
                {report.row_errors.slice(0, 5).map((row, index) => (
                  <li key={index}>
                    Line {row.line}, {row.field}: {row.message}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => downloadErrors(report)}
                className="mt-2 inline-flex items-center gap-1 underline"
              >
                <Download className="h-4 w-4" />
                Download all {report.error_count} errors
              </button>
            </div>
          )}
          {!result && (
            <>
              <p className="mt-4 text-sm text-slate-600">
                First {report.sample_rows.length} mapped rows
              </p>
              <div className="mt-2 max-w-full overflow-x-auto">
                <table
                  className="w-full text-left text-sm"
                  aria-label="Mapped import sample"
                >
                  <thead>
                    <tr className="border-b border-slate-200">
                      {[
                        "Line",
                        "Action",
                        ...STUDENT_IMPORT_FIELDS.filter(
                          ([field]) => mapping[field],
                        ).map(([, label]) => label),
                      ].map((label) => (
                        <th
                          key={label}
                          className="whitespace-nowrap px-3 py-2 font-medium text-slate-700"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.sample_rows.map((row) => (
                      <tr key={row.line} className="border-b border-slate-200">
                        <td className="px-3 py-2 text-slate-700">{row.line}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.action}
                        </td>
                        {STUDENT_IMPORT_FIELDS.filter(
                          ([field]) => mapping[field],
                        ).map(([field]) => (
                          <td
                            key={field}
                            className="max-w-xs break-words px-3 py-2 text-slate-700"
                          >
                            {row.values[field] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                disabled={
                  Boolean(busy) || report.created + report.updated === 0
                }
                onClick={() => void request(true)}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Confirm import {report.created + report.updated} rows
              </button>
            </>
          )}
        </div>
      )}
      {!uncertain && (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={onDone}
          className="mt-4 rounded-lg px-3 py-2 text-sm text-slate-700 disabled:opacity-40"
        >
          {result ? "Done" : "Cancel"}
        </button>
      )}
    </section>
  );
}
