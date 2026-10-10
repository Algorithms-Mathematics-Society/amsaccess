"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";

/**
 * A code editor sized for the pane it sits in.
 *
 * CodeMirror rather than a textarea because a problemsetter is writing C++
 * for twenty minutes at a time, and brace matching and a visible indent
 * guide are the difference between that being work and being a chore.
 *
 * Deliberately light-themed: the rest of the org portal is light, and an
 * editor that is the only dark rectangle on the page reads as a different
 * application embedded in this one.
 */
export function CodeBox({
  value,
  onChange,
  language = "cpp",
  minHeight = 260,
  readOnly = false,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  language?: "cpp" | "markdown" | "text";
  minHeight?: number;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const extensions = useMemo(() => {
    const base = [EditorView.lineWrapping];
    if (language === "cpp") return [...base, cpp()];
    if (language === "markdown") return [...base, markdown()];
    return base;
  }, [language]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        readOnly={readOnly}
        placeholder={placeholder}
        minHeight={`${minHeight}px`}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          autocompletion: false,
          // Off because a problemsetter pasting a reference solution gets a
          // cascade of unwanted brackets otherwise.
          closeBrackets: false,
        }}
        style={{ fontSize: 13 }}
      />
    </div>
  );
}

/** A one-line labelled field, for the many short inputs in this editor. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 " +
  "focus:ring-violet-500";

/** A plain monospace box, for test input and expected output. */
export function PlainBox({
  value,
  onChange,
  rows = 6,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      spellCheck={false}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
    />
  );
}
