"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

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
    <main className="flex min-h-screen items-center justify-center px-5" style={{ background: "#000000" }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-md">
        <div
          className="relative rounded-2xl border p-8"
          style={{ borderColor: "rgba(139,92,246,0.2)", background: "rgba(9,9,11,0.96)", backdropFilter: "blur(24px)" }}
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ border: "1px solid rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.08)", boxShadow: "0 0 20px rgba(139,92,246,0.2)" }}
            >
              <Building2 className="h-5 w-5" style={{ color: "rgb(139,92,246)" }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">Create your organization</h1>
              <p className="mt-1 text-xs" style={{ color: "#71717A" }}>Set up your org to host contests</p>
            </div>
          </div>

          {error && (
            <div
              className="mb-5 rounded border px-4 py-3 text-sm"
              style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#FCA5A5" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Organization name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme University"
                className="w-full rounded border py-2.5 px-4 text-sm text-white outline-none transition"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", caretColor: "rgb(139,92,246)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Slug</label>
              <input
                type="text"
                required
                pattern="[a-z0-9\-]+"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                placeholder="acme-university"
                className="w-full rounded border py-2.5 px-4 text-sm text-white outline-none transition"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", caretColor: "rgb(139,92,246)", fontFamily: "monospace" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <p className="mt-1 text-xs" style={{ color: "#52525B" }}>Lowercase letters, numbers, and hyphens only</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "rgb(139,92,246)", boxShadow: "0 0 20px rgba(139,92,246,0.35)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(124,58,237)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(139,92,246)"; }}
            >
              {loading ? "Creating…" : "Create organization"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
