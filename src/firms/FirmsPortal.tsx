"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BarChart3, ChevronRight,
  Code2, Eye, EyeOff, ExternalLink, GraduationCap, LayoutDashboard, Lock, LogOut, Mail, MapPin,
  Menu, Search, ShieldCheck, Trophy, UserRound, X,
} from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";

type FirmUser = { uid: string; display_name: string; email: string; role: string | null; organization_name: string | null };
type TalentCard = {
  uid: string; handle: string; display_name: string; college: string; branch: string;
  graduation_year: number | null; location: string; contests_entered: number;
  problems_solved: number; submissions_total: number; accepted_total: number;
  accuracy: number | null; top_tags: string[]; last_active: string | null;
};
type TalentPage = { total: number; limit: number; offset: number; candidates: TalentCard[] };
type Profile = TalentCard & {
  email: string; phone: string; linkedin_url: string; github_url: string; resume_url: string;
  contests: { uid: string; title: string; starts_at: string; status: string; solved: number; attempted: number; submissions: number }[];
  tags: { tag: string; solved: number; attempted: number }[];
  submissions: { uid: string; created_at: string; verdict: string; language: string; problem_title: string; contest_title: string }[];
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Request failed."), { status: response.status });
  return data as T;
}

function Loading({ label = "Loading workspace…" }: { label?: string }) {
  return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-border border-t-gold" /><p className="mt-4 text-sm text-muted">{label}</p></div></div>;
}

function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{message}</p>{retry && <button onClick={retry} className="mt-3 font-semibold underline underline-offset-4">Try again</button>}</div>;
}

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/api/firms/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.replace("/firms/dashboard"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed."); }
    finally { setBusy(false); }
  }
  return <main className="ac-theme min-h-screen overflow-hidden bg-paper font-body text-ink selection:bg-violet-soft selection:text-violet-deep">
    <MarketingHeader />
    <section className="relative flex min-h-[calc(100dvh-5rem)] items-center overflow-hidden px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:px-8 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgb(var(--ac-violet-soft)/0.8),transparent_34rem)]" />
      <div className="relative z-10 mx-auto grid w-full max-w-[96rem] gap-10 sm:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] lg:items-center lg:gap-16 xl:gap-24">
        <section className="max-w-2xl">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-violet">Firms</p>
          <h1 className="mt-5 font-display text-[clamp(2.5rem,5vw,5.5rem)] font-normal leading-[1.05] tracking-[-0.035em] text-ink lg:leading-[1.02]">Welcome to AMS Access.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">Sign in to continue to your firm workspace.</p>
        </section>
        <section className="rounded-panel border border-line bg-surface p-6 shadow-xl shadow-slate-950/10 sm:p-9">
          <div className="mb-6">
            <p className="text-sm font-semibold tracking-tight text-ink">AMS Access <span className="font-normal text-muted">/ Firms</span></p>
            <h2 className="mt-8 font-display text-3xl text-ink">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use your work email and password.</p>
          </div>
          {error && <div role="alert" className="mb-5 rounded-control border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="firms-email" className="mb-1.5 block text-xs font-semibold text-ink">Work email</label>
              <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input id="firms-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-control border border-line bg-paper py-3 pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-violet focus:bg-surface focus:ring-4 focus:ring-violet/15" placeholder="you@firm.com" /></div>
            </div>
            <div>
              <label htmlFor="firms-password" className="mb-1.5 block text-xs font-semibold text-ink">Password</label>
              <div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input id="firms-password" required type={showPwd ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-control border border-line bg-paper py-3 pl-10 pr-11 text-sm text-ink outline-none transition placeholder:text-muted focus:border-violet focus:bg-surface focus:ring-4 focus:ring-violet/15" placeholder="Password" /><button type="button" onClick={() => setShowPwd((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink" tabIndex={-1} aria-label={showPwd ? "Hide password" : "Show password"}>{showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            </div>
            <button type="submit" disabled={busy} className="mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-violet px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-deep active:translate-y-px disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in…" : "Sign in to workspace"}<ArrowRight className="h-4 w-4" /></button>
          </form>
        </section>
      </div>
    </section>
    <MarketingFooter />
  </main>;
}

const nav = [
  { href: "/firms/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/firms/discover", label: "Discover talent", icon: Search },
];

function Shell({ user, children }: { user: FirmUser; children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, [open]);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/firms/login"); router.refresh(); }
  const links = <nav className="space-y-1 px-3">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${pathname === href ? "bg-[#211a2b] text-white" : "text-text hover:bg-surface-2 hover:text-text-strong"}`}><Icon className="h-[18px] w-[18px]" />{label}</Link>)}</nav>;
  const sidebar = <><div className="px-4"><div className="rounded-xl bg-[#211a2b] p-4"><img src="/AMS_ACCESS.svg" alt="AMS Access" className="h-6 w-auto" /><p className="mt-3 border-t border-white/10 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Firms workspace</p></div></div><div className="mt-7">{links}</div><div className="mt-auto border-t border-border p-4"><p className="truncate text-sm font-semibold text-text-strong">{user.organization_name || user.display_name}</p><p className="mt-1 truncate text-xs text-muted">{user.email}</p><button onClick={logout} className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-text hover:bg-surface-2"><LogOut className="h-4 w-4" />Sign out</button></div></>;
  return <div className="min-h-[100dvh] bg-bg"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface py-5 md:flex">{sidebar}</aside>{open && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#211a2b]/45" /><aside className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col overflow-y-auto bg-surface py-5 shadow-2xl">{sidebar}<button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 rounded-lg bg-white/10 p-2 text-white"><X className="h-5 w-5" /></button></aside></div>}<div className="md:pl-64"><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-text md:hidden"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="truncate text-sm font-semibold text-text-strong">{user.organization_name || "AMS partner firm"}</p><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Verified AWS session</p></div></div><ShieldCheck className="h-5 w-5 text-gold" /></header><main className="mx-auto w-full max-w-[92rem] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">{children}</main></div></div>;
}

function CandidateCard({ candidate }: { candidate: TalentCard }) {
  return <Link href={`/firms/candidates/${encodeURIComponent(candidate.handle)}`} className="group flex min-w-0 flex-col rounded-xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg hover:shadow-[#211a2b]/5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-semibold text-text-strong">{candidate.display_name}</h3><p className="mt-1 font-mono text-xs text-muted">@{candidate.handle}</p></div><ChevronRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-gold" /></div>
    <p className="mt-4 flex items-start gap-2 text-sm text-text"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span>{[candidate.college, candidate.branch, candidate.graduation_year].filter(Boolean).join(" · ") || "Academic details not provided"}</span></p>
    {candidate.location && <p className="mt-2 flex items-center gap-2 text-sm text-muted"><MapPin className="h-4 w-4" />{candidate.location}</p>}
    <div className="mt-5 grid grid-cols-3 border-t border-border pt-4 text-center"><Metric value={candidate.problems_solved} label="Solved" /><Metric value={candidate.contests_entered} label="Contests" /><Metric value={candidate.accuracy == null ? "—" : `${candidate.accuracy}%`} label="Accuracy" /></div>
    {candidate.top_tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{candidate.top_tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-gold-soft px-2.5 py-1 text-[10px] font-semibold text-gold">{tag}</span>)}</div>}
  </Link>;
}

function Metric({ value, label }: { value: ReactNode; label: string }) { return <div><p className="font-mono text-xl font-semibold text-text-strong">{value}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p></div>; }

function Dashboard({ user }: { user: FirmUser }) {
  const [stats, setStats] = useState<{ candidates: number; active_last_30_days: number; contests: number } | null>(null);
  const [talent, setTalent] = useState<TalentCard[]>([]); const [error, setError] = useState("");
  useEffect(() => { Promise.all([api<{ candidates: number; active_last_30_days: number; contests: number }>("/api/firms/talent/stats"), api<TalentPage>("/api/firms/talent?limit=6&sort=solved")]).then(([s, t]) => { setStats(s); setTalent(t.candidates); }).catch((e) => setError(e.message)); }, []);
  return <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Workspace overview</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-4xl font-semibold tracking-tight text-text-strong sm:text-5xl">Good to see you, {user.display_name.split(" ")[0]}.</h1><p className="mt-3 max-w-2xl text-text">A current view of the candidate network recorded on AMS infrastructure.</p></div><Link href="/firms/discover" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-white">Explore talent<ArrowRight className="h-4 w-4" /></Link></div>{error ? <div className="mt-8"><ErrorState message={error} /></div> : !stats ? <Loading /> : <><section className="mt-10 grid overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-3"><Stat icon={UserRound} value={stats.candidates} label="Candidate profiles" /><Stat icon={BarChart3} value={stats.active_last_30_days} label="Active in 30 days" /><Stat icon={Trophy} value={stats.contests} label="Recorded contests" /></section><section className="mt-12"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Evidence leaders</p><h2 className="mt-2 text-2xl font-semibold text-text-strong">Candidates to review</h2></div><Link href="/firms/discover" className="text-sm font-semibold text-gold">View all</Link></div><div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{talent.map((c) => <CandidateCard key={c.uid} candidate={c} />)}</div></section></>}</div>;
}

function Stat({ icon: Icon, value, label }: { icon: typeof UserRound; value: number; label: string }) { return <div className="border-border p-6 sm:border-l sm:first:border-l-0 lg:p-8"><Icon className="h-5 w-5 text-gold" /><p className="mt-6 font-mono text-4xl font-semibold text-text-strong">{value.toLocaleString()}</p><p className="mt-2 text-sm text-muted">{label}</p></div>; }

function Discover() {
  const params = useSearchParams(); const router = useRouter(); const [q, setQ] = useState(params.get("q") || ""); const [page, setPage] = useState<TalentPage | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const query = params.get("q") || "";
  useEffect(() => { setLoading(true); setError(""); api<TalentPage>(`/api/firms/talent?limit=60&sort=solved&q=${encodeURIComponent(query)}`).then(setPage).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [query]);
  function submit(e: FormEvent) { e.preventDefault(); router.push(`/firms/discover${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); }
  return <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Talent directory</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-strong sm:text-5xl">Find signal that fits.</h1><p className="mt-3 max-w-2xl text-text">Search names, handles, and colleges across verified AMS participant records.</p><form onSubmit={submit} className="mt-8 flex max-w-3xl gap-2 rounded-xl border border-border bg-surface p-2"><Search className="ml-2 mt-3 h-5 w-5 shrink-0 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-text-strong outline-none" placeholder="Search candidate, handle, or college" /><button className="rounded-lg bg-[#211a2b] px-5 text-sm font-semibold text-white">Search</button></form><div className="mt-9 flex items-center justify-between"><h2 className="text-lg font-semibold text-text-strong">{page ? `${page.total.toLocaleString()} candidate${page.total === 1 ? "" : "s"}` : "Candidates"}</h2>{query && <Link href="/firms/discover" className="text-sm font-semibold text-gold">Clear search</Link>}</div>{loading ? <Loading label="Searching AWS talent records…" /> : error ? <div className="mt-5"><ErrorState message={error} /></div> : page?.candidates.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{page.candidates.map((c) => <CandidateCard key={c.uid} candidate={c} />)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border bg-surface p-10 text-center"><Search className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-semibold text-text-strong">No matching candidates</p><p className="mt-1 text-sm text-muted">Try a broader name, handle, or college.</p></div>}</div>;
}

function Candidate({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<Profile | null>(null); const [error, setError] = useState("");
  useEffect(() => { api<Profile>(`/api/firms/talent/${encodeURIComponent(handle)}`).then(setProfile).catch((e) => setError(e.message)); }, [handle]);
  if (error) return <><Link href="/firms/discover" className="inline-flex items-center gap-2 text-sm font-semibold text-gold"><ArrowLeft className="h-4 w-4" />Back to talent</Link><div className="mt-6"><ErrorState message={error} /></div></>;
  if (!profile) return <Loading label="Loading candidate evidence…" />;
  const accuracy = profile.submissions_total ? Math.round(profile.accepted_total * 100 / profile.submissions_total) : null;
  return <div><Link href="/firms/discover" className="inline-flex items-center gap-2 text-sm font-semibold text-gold"><ArrowLeft className="h-4 w-4" />Back to talent</Link><header className="mt-7 rounded-2xl bg-[#211a2b] p-6 text-white sm:p-8 lg:p-10"><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="font-mono text-xs text-white/55">@{profile.handle}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{profile.display_name}</h1><p className="mt-4 max-w-2xl text-white/65">{[profile.college, profile.branch, profile.graduation_year].filter(Boolean).join(" · ") || "Academic profile not provided"}</p></div><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-[#d8c6a5]" />AWS source record</span></div><div className="mt-9 grid grid-cols-3 gap-4 border-t border-white/10 pt-7"><MetricDark value={profile.problems_solved} label="Problems solved" /><MetricDark value={profile.contests_entered} label="Contests" /><MetricDark value={accuracy == null ? "—" : `${accuracy}%`} label="Accuracy" /></div></header><div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><div className="space-y-6"><Panel title="Skill evidence" icon={Code2}>{profile.tags.length ? <div className="space-y-4">{profile.tags.map((tag) => <div key={tag.tag}><div className="flex justify-between text-sm"><span className="font-semibold text-text-strong">{tag.tag}</span><span className="font-mono text-muted">{tag.solved}/{tag.attempted} solved</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gold" style={{ width: `${tag.attempted ? Math.round(tag.solved * 100 / tag.attempted) : 0}%` }} /></div></div>)}</div> : <p className="text-sm text-muted">No tagged evidence recorded yet.</p>}</Panel><Panel title="Contest history" icon={Trophy}>{profile.contests.length ? <div className="divide-y divide-border">{profile.contests.map((contest) => <div key={contest.uid} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div><p className="font-semibold text-text-strong">{contest.title}</p><p className="mt-1 text-xs text-muted">{new Date(contest.starts_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</p></div><p className="font-mono text-sm text-text">{contest.solved} solved · {contest.submissions} submissions</p></div>)}</div> : <p className="text-sm text-muted">No contest history recorded.</p>}</Panel></div><aside className="space-y-6"><Panel title="Candidate details" icon={UserRound}><dl className="space-y-4 text-sm"><Detail icon={MapPin} label="Location" value={profile.location || "Not provided"} /><Detail icon={Mail} label="Contact" value={profile.email || "Not disclosed"} /><Detail icon={GraduationCap} label="Education" value={[profile.college, profile.branch].filter(Boolean).join(" · ") || "Not provided"} /></dl>{(profile.linkedin_url || profile.github_url || profile.resume_url) && <div className="mt-5 flex flex-wrap gap-2">{[["LinkedIn", profile.linkedin_url], ["GitHub", profile.github_url], ["Résumé", profile.resume_url]].filter(([, url]) => url).map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-strong hover:border-gold"><ExternalLink className="h-3.5 w-3.5" />{label}</a>)}</div>}</Panel><Panel title="Recent activity" icon={BarChart3}>{profile.submissions.slice(0, 6).map((submission) => <div key={submission.uid} className="border-b border-border py-3 last:border-0"><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-text-strong">{submission.problem_title}</p><span className={`text-xs font-semibold ${submission.verdict === "AC" ? "text-green-600" : "text-muted"}`}>{submission.verdict}</span></div><p className="mt-1 text-xs text-muted">{submission.contest_title} · {submission.language}</p></div>)}</Panel></aside></div></div>;
}

function MetricDark({ value, label }: { value: ReactNode; label: string }) { return <div><p className="font-mono text-2xl font-semibold sm:text-3xl">{value}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</p></div>; }
function Panel({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: ReactNode }) { return <section className="rounded-xl border border-border bg-surface p-5 sm:p-6"><h2 className="flex items-center gap-2 text-base font-semibold text-text-strong"><Icon className="h-4 w-4 text-gold" />{title}</h2><div className="mt-5">{children}</div></section>; }
function Detail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) { return <div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><div><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 break-words font-medium text-text-strong">{value}</dd></div></div>; }

export default function FirmsPortal() {
  const pathname = usePathname(); const router = useRouter(); const [user, setUser] = useState<FirmUser | null>(null); const [checking, setChecking] = useState(pathname !== "/firms/login");
  useEffect(() => {
    if (pathname === "/firms/login") { setChecking(false); return; }
    setChecking(true); api<{ user: FirmUser }>("/api/firms/session").then((data) => setUser(data.user)).catch(() => router.replace("/firms/login")).finally(() => setChecking(false));
  }, [pathname, router]);
  if (pathname === "/firms/login") return <Login />;
  if (checking || !user) return <Loading />;
  const candidatePrefix = "/firms/candidates/";
  const content = pathname.startsWith(candidatePrefix) ? <Candidate handle={decodeURIComponent(pathname.slice(candidatePrefix.length))} /> : pathname === "/firms/discover" ? <Discover /> : <Dashboard user={user} />;
  return <Shell user={user}>{content}</Shell>;
}
