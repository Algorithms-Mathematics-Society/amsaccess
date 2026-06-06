"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function OrgSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(toSlug(v));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await apiFetch<{ redirectTo: string }>("/api/org/setup", {
        method: "POST",
        body: JSON.stringify({ name, slug })
      });

      router.push(result.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="light flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 px-5" style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-purple-50 shadow-sm">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">Create your organization</h1>
              <p className="mt-1 text-xs text-slate-500">Set up your org to host contests</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Organization name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme University"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Slug</label>
              <input
                type="text"
                required
                pattern="[a-z0-9\-]+"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="acme-university"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 font-mono"
              />
              <p className="mt-1 text-xs text-slate-400">Lowercase letters, numbers, and hyphens only</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 ams-btn ams-btn-primary ams-btn-md w-full"
            >
              {loading ? "Creating…" : "Create organization"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
