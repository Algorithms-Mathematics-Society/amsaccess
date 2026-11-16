"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Modal } from "@/components/Modal";

export type ConfirmOptions = {
  title: string;
  /** What happens, to whom, and whether it can be undone. */
  body: React.ReactNode;
  /** Repeat the verb and the object: "End contest", "Revoke Priya's login". */
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  /** For actions that cannot be undone and hit everyone: the user must type this word. */
  typeToConfirm?: string;
};

/**
 * One confirmation pattern for every risky action in the console.
 *
 * `const [dialog, confirm] = useConfirm();` then render `{dialog}` and
 * `if (!(await confirm({...}))) return;` before the request.
 */
export function useConfirm(): [React.ReactNode, (options: ConfirmOptions) => Promise<boolean>] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const inputId = useId();

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setTyped("");
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }

  const word = options?.typeToConfirm;
  const blocked = Boolean(word) && typed.trim().toUpperCase() !== word!.toUpperCase();

  const dialog = (
    <Modal open={options !== null} onClose={() => close(false)} labelledBy={titleId} describedBy={bodyId} cardClassName="max-w-md">
      {options && (
        <form
          className="p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!blocked) close(true);
          }}
        >
          <h2 id={titleId} className="text-base font-semibold text-slate-950">{options.title}</h2>
          <div id={bodyId} className="mt-2 space-y-2 text-sm text-slate-700">{options.body}</div>
          {word && (
            <div className="mt-4">
              <label htmlFor={inputId} className="block text-xs font-medium text-slate-700">
                Type <span className="font-mono">{word}</span> to confirm
              </label>
              <input
                id={inputId}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-slate-400 px-3 py-2 font-mono text-sm"
              />
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => close(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {options.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="submit"
              disabled={blocked}
              className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-40 ${
                options.danger ? "bg-red-700 hover:bg-red-800" : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {options.confirmLabel}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );

  return [dialog, confirm];
}
