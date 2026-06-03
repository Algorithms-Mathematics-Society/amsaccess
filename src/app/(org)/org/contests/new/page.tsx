"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";
import { OrgPortalShell } from "@/components/OrgPortalShell";

export default function NewContestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scoringType, setScoringType] = useState<"IOI" | "ICPC" | "CF">("ICPC");
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(["C++17", "Python3", "Java17"]);
  const [pluginType, setPluginType] = useState<"CP" | "CHESS">("CP");
  const [pluginConfig, setPluginConfig] = useState<string>('{"mode":"PVE"}');
  const [timezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      JSON.parse(pluginConfig.trim() || "{}");
    } catch {
      setError("Plugin config must be valid JSON.");
      return;
    }
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    setLoading(true);
    try {
      const contest = await apiFetch<{ id: string; redirectTo: string }>("/api/org/contests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          start_at: now.toISOString(),
          end_at: inOneHour.toISOString(),
          timezone,
          status: "DRAFT",
          scoring_type: pluginType === "CP" ? scoringType : "ICPC",
          allowed_languages: pluginType === "CP" ? allowedLanguages : ["C++17"],
          plugin_type: pluginType,
          plugin_config: pluginConfig.trim() || "{}",
          pluginType,
          pluginConfig: pluginConfig.trim() || "{}",
        })
      });

      const target = pluginType === "CHESS"
        ? `${contest.redirectTo}?mode=CHESS`
        : contest.redirectTo;
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OrgPortalShell active="new-contest">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white/80 px-8 py-6 backdrop-blur-xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-purple-50">
          <Calendar className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New contest</h1>
          <p className="mt-0.5 text-sm text-slate-500">Schedule a contest and invite candidates</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
        <div className="max-w-2xl">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm space-y-5">
            <Field label="Title">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Spring 2025 Web Dev Challenge"
                className="glass-input text-sm"
              />
            </Field>

            <Field label="Description" hint="Optional — shown to invited candidates">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the contest…"
                className="glass-input resize-none text-sm"
              />
            </Field>

            <Field label="Contest type">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {(["CP", "CHESS"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPluginType(mode)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                      pluginType === mode
                        ? "bg-purple-50 border border-purple-200 text-purple-700"
                        : "bg-transparent border border-transparent text-slate-500 hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    {mode === "CP" ? "CP Contest" : "Chess Contest"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Contest timings/status are configured after creation inside contest settings.
              </p>
            </Field>

            {pluginType === "CP" ? (
              <>
                <Field label="Scoring type">
                  <div className="flex gap-3">
                    {(["IOI", "ICPC", "CF"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScoringType(s)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          scoringType === s
                            ? "bg-purple-50 border border-purple-200 text-purple-700"
                            : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Allowed languages">
                  <div className="flex flex-wrap gap-2">
                    {(["C++17", "Python3", "Java17", "Go", "Rust"] as const).map((lang) => {
                      const active = allowedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() =>
                            setAllowedLanguages(
                              active ? allowedLanguages.filter((l) => l !== lang) : [...allowedLanguages, lang]
                            )
                          }
                          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                            active
                              ? "bg-purple-50 border border-purple-200 text-purple-700"
                              : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </>
            ) : (
              <Field label="Plugin config (JSON)" hint="Used for CHESS runtime/session behavior">
                <textarea
                  rows={4}
                  value={pluginConfig}
                  onChange={(e) => setPluginConfig(e.target.value)}
                  className="glass-input resize-none font-mono text-xs"
                />
              </Field>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create contest"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/org/dashboard")}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </OrgPortalShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <label className="text-xs font-medium text-slate-500">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
