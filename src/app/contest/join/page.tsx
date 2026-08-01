"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Enter a contest code and go.
 *
 * The input is uppercased and stripped of spaces/dashes as you type, because
 * a code is read off a slide or dictated aloud — "fx8n prtt" and "FX8N-PRTT"
 * are the same code and both should just work.
 */
export default function JoinContestPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const normalise = (raw: string) =>
    raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    if (!code || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contest/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not join that contest.");
        return;
      }
      router.push(`/contest/${data.uid}`);
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-ams-bg text-ams-ink flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-ams-heading tracking-tight">Join a contest</h1>
        <p className="mt-2 text-ams-muted">
          Enter the code your organiser gave you.
        </p>

        <form onSubmit={join} className="mt-8 space-y-4">
          <div>
            <label htmlFor="code" className="sr-only">
              Contest code
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(normalise(e.target.value))}
              placeholder="FX8NPRTT"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "code-error" : undefined}
              className="w-full rounded-lg border border-ams-border bg-ams-field px-4 py-4
                         text-center font-mono text-2xl tracking-[0.35em] text-ams-heading
                         placeholder:text-ams-muted/40 focus:border-ams-accent focus:outline-none
                         focus:ring-2 focus:ring-ams-accent/30"
            />
          </div>

          {error && (
            <p id="code-error" role="alert" className="text-sm text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!code || busy}
            className="w-full rounded-lg bg-ams-accent px-4 py-3 font-semibold text-ams-dark
                       transition hover:brightness-110 disabled:cursor-not-allowed
                       disabled:opacity-40"
          >
            {busy ? "Joining…" : "Join contest"}
          </button>
        </form>
      </div>
    </main>
  );
}
