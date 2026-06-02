"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
import { ProctorNetwork } from "@/components/ProctorNetwork";
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
          password,
        }),
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
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />

      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-50/60 via-transparent to-slate-50/40" />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_26rem] lg:items-center">
          <div className="max-w-2xl">

            <h1 className="text-4xl font-medium leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-7xl">
              Sign in to download Access.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Downloads are reserved for organization admins and operators. Use the same organization credentials you use for the AMS portal.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-ams-dark p-5 text-white shadow-2xl shadow-slate-950/20">
              <div className="absolute inset-0" />
              <div className="relative min-h-44 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-5">
                <ProctorNetwork nodeCount={24} connectDist={120} mouseRadius={140} />
                <div className="relative z-10 flex h-full flex-col justify-between gap-10">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-300/30 bg-purple-300/10 text-purple-100">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Protected release access</p>
                      <p className="mt-1 text-xs text-purple-100/60">Authenticated session required</p>
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs text-purple-100/65 sm:grid-cols-3">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">Windows</span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">macOS</span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md">Linux</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
            <div className="mb-6">
              <img src="/AMS_ACCESS_LIGHT(1).svg" alt="AMS Access" className="h-7 w-auto" />
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">Organization portal</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Enter your organization credentials to continue.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="org@amsaccess.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
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
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Candidate access happens inside the desktop app.
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
