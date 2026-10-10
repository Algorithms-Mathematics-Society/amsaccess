"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
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
      await apiFetch<{ user: unknown }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      // `next` lets a redirect-to-login return you where you were.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/org/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ac-theme min-h-screen overflow-hidden bg-paper font-body text-ink selection:bg-violet-soft selection:text-violet-deep">
      <MarketingHeader />

      <section className="relative flex min-h-[calc(100dvh-5rem)] items-center overflow-hidden px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:px-8 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgb(var(--ac-violet-soft)/0.8),transparent_34rem)]" />
        <div className="relative z-10 mx-auto grid w-full max-w-[96rem] gap-10 sm:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] lg:items-center lg:gap-16 xl:gap-24">
          <div className="max-w-2xl">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-violet">Organization portal</p>
            <h1 className="mt-5 font-display text-[clamp(2.5rem,5vw,5.5rem)] font-normal leading-[1.05] tracking-[-0.035em] text-ink lg:leading-[1.02]">
              The control room for serious rounds.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
              Sign in to manage contests, participants, judging infrastructure, and the desktop release your organization runs on.
            </p>

          </div>

          <div className="rounded-panel border border-line bg-surface p-6 shadow-xl shadow-slate-950/10 sm:p-9">
            <div className="mb-6">
              <p className="text-sm font-semibold tracking-tight text-ink">AMS Access <span className="font-normal text-muted">/ Organization</span></p>
              <h2 className="mt-8 font-display text-3xl text-ink">Welcome back.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Enter your organization credentials to continue.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-control border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="org@amsaccess.com"
                    className="w-full rounded-control border border-line bg-paper py-3 pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-violet focus:bg-surface focus:ring-4 focus:ring-violet/15"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full rounded-control border border-line bg-paper py-3 pl-10 pr-11 text-sm text-ink outline-none transition placeholder:text-muted focus:border-violet focus:bg-surface focus:ring-4 focus:ring-violet/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                    tabIndex={-1}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-violet px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-deep active:translate-y-px disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-muted">
              Candidate access happens inside the desktop app.
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
