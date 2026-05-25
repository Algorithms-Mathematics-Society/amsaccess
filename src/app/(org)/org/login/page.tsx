"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, Building2 } from "lucide-react";
import { apiFetch } from "@/lib/client/apiClient";

export default function OrgLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const result = await apiFetch<{ redirectTo: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          scope: "org",
          email: email.trim(),
          password
        })
      });

      router.push(result.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
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

      <div className="relative w-full max-w-sm">
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.15), transparent)",
          }}
        />

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
              <h1 className="text-lg font-semibold tracking-tight text-white">Organization Portal</h1>
              <p className="mt-1 text-xs" style={{ color: "#71717A" }}>Access by AMS · org.amsaccess.com</p>
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#52525B" }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="org@amsaccess.com"
                  className="w-full rounded border py-2.5 pl-9 pr-4 text-sm text-white outline-none transition"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", caretColor: "rgb(139,92,246)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "#A1A1AA" }}>Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#52525B" }} />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border py-2.5 pl-9 pr-10 text-sm text-white outline-none transition"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", caretColor: "rgb(139,92,246)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                  style={{ color: "#52525B" }}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "rgb(139,92,246)", boxShadow: "0 0 20px rgba(139,92,246,0.35)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(124,58,237)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(139,92,246)"; }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: "#3F3F46" }}>
            Organization accounts only. Candidates use the desktop app.
          </p>
        </div>
      </div>
    </main>
  );
}
