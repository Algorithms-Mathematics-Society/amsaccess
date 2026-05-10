"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

export default function NewContestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED">("DRAFT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (new Date(endAt) <= new Date(startAt)) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);
    try {
      const contest = await apiFetch<{ id: string; redirectTo: string }>("/api/org/contests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          status
        })
      });

      router.push(contest.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-8 py-8" style={{ background: "#000000", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-2xl">
        <Link
          href="/org/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm transition"
          style={{ color: "#71717A" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#71717A"; }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <Calendar className="h-5 w-5" style={{ color: "#a855f7" }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">New contest</h1>
            <p className="text-sm" style={{ color: "#64748b" }}>Schedule a contest and invite candidates</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-card space-y-5 p-7">
          <Field label="Title">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Spring 2025 Web Dev Challenge"
              className="glass-input text-sm text-white"
            />
          </Field>

          <Field label="Description" hint="Optional — shown to invited candidates">
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the contest…"
              className="glass-input resize-none text-sm text-white"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date & time">
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="glass-input text-sm text-white"
                style={{ colorScheme: "dark" }}
              />
            </Field>
            <Field label="End date & time">
              <input
                type="datetime-local"
                required
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="glass-input text-sm text-white"
                style={{ colorScheme: "dark" }}
              />
            </Field>
          </div>

          <Field label="Status">
            <div className="flex gap-3">
              {(["DRAFT", "SCHEDULED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition"
                  style={
                    status === s
                      ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.5)", color: "#c4b5fd" }
                      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ background: "rgb(139,92,246)", boxShadow: "0 0 16px rgba(139,92,246,0.25)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(124,58,237)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(139,92,246)"; }}
            >
              {loading ? "Creating…" : "Create contest"}
            </button>
            <Link
              href="/org/dashboard"
              className="rounded-lg px-5 py-2.5 text-sm font-medium transition"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#71717A" }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <label className="text-xs font-medium" style={{ color: "#A1A1AA" }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: "#52525B" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
