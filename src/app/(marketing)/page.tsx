import {
  ArrowRight,
  Check,
  Circle,
  Code2,
  Download,
  FileText,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AMSLogo } from "@/components/AMSLogo";
import { CommandMenu } from "@/components/CommandMenu";
import { PlatformLogo } from "@/components/PlatformLogo";
import { ProductConfigTabs } from "./ProductConfigTabs";

// Deferred client islands — excluded from the initial JS bundle.
const ScrollObserver = dynamic(
  () => import("@/components/ScrollObserver").then(m => ({ default: m.ScrollObserver })),
  { ssr: false }
);

const MobileNav = dynamic(
  () => import("@/components/MobileNav").then(m => ({ default: m.MobileNav })),
  { ssr: false }
);

const SpotlightCard = dynamic(
  () => import("@/components/SpotlightCard").then(m => ({ default: m.SpotlightCard })),
  {
    ssr: false,
    loading: () => <article className="glass-card relative overflow-hidden p-5" aria-hidden="true" />
  }
);

const LazyMount = dynamic(
  () => import("@/components/LazyMount").then(m => ({ default: m.LazyMount })),
  { ssr: false }
);

const navItems = [
  ["Product", "/#product"],
  ["Pricing", "/pricing"],
  ["Download", "/download"],
  ["Docs", "/docs"],
  ["Changelog", "/changelog"],
  ["Contact", "/contact"]
];

const metrics = [
  { value: "Windows", label: "desktop installer" },
  { value: "macOS", label: "desktop package" },
  { value: "Linux", label: "desktop build" },
  { value: "Versioned", label: "release notes" }
] as const;

const platformMetrics = metrics.slice(0, 3) as Array<(typeof metrics)[0] | (typeof metrics)[1] | (typeof metrics)[2]>;

const foundation = [
  {
    title: "The room",
    body: "A controlled desktop environment gives the round a boundary before the first response is written."
  },
  {
    title: "The record",
    body: "Session context is captured quietly, beside the work, so review starts from evidence instead of guesswork."
  },
  {
    title: "The review",
    body: "Written output and event history stay together, giving reviewers the shape of the session as it happened."
  }
];

const useCases = [
  ["Hiring", "Run technical and written rounds where reviewers need more than a final answer."],
  ["University", "Give remote evaluations a consistent desktop surface and a reviewable session record."],
  ["Olympiad", "Keep high-trust written windows structured without turning review into surveillance."],
  ["Scholarship", "Preserve the work, the session context, and the evidence behind consequential decisions."]
] as const;

const workflowSections = [
  {
    eyebrow: "Controlled environment",
    title: "Put the evaluation inside a product with edges.",
    body: "A serious round should not depend on a browser tab, a meeting link, and a policy document. Access by AMS gives the session a clear operating surface.",
    visual: "operations"
  },
  {
    eyebrow: "Review context",
    title: "A submission is evidence. A session is context.",
    body: "Answers matter, but so does the path around them. Timelines make the review legible without turning judgment into automation.",
    visual: "code"
  },
  {
    eyebrow: "Human judgment",
    title: "Keep reviewers close to the work.",
    body: "Access by AMS packages written responses, status, timestamps, and activity history so reviewers can decide with confidence and restraint.",
    visual: "handoff"
  }
];

const changelog = [
  ["Desktop releases", "Installers are organized by platform with version notes and release context."],
  ["Session shell", "Fullscreen session state remains visible while activity evidence is recorded for review."],
  ["Reviewer evidence", "Written output and activity timelines stay paired inside the review surface."],
  ["Release notes", "Changelog entries keep operational teams aligned on app behavior and deployment updates."]
];

const pricingPlans = [
  ["Pilot", "Validation rounds", "For pilots and small high-trust rounds.", "Controlled sessions, basic review context, versioned releases."],
  ["Event", "Hiring and contest windows", "For hiring, olympiad, and scholarship windows.", "Higher volume, reviewer workflows, export support."],
  ["Institution", "Recurring programs", "For recurring evaluations across teams or programs.", "Multiple admins, centralized review, operational reporting."],
  ["Enterprise", "Custom deployment", "For procurement, integrations, and managed rollout needs.", "Custom limits, support paths, and deployment planning."]
] as const;

const downloadPlatforms = [
  ["Windows", "Installer package", "Version notes and checksum-ready release flow."],
  ["macOS", "Desktop package", "Release path prepared for managed deployments."],
  ["Linux", "Desktop build", "Artifacts designed for technical operators."]
] as const;

const footerGroups = [
  {
    group: "Product",
    items: [["Showcase", "/#product"], ["Controlled round", "/controlled-round"], ["Review context", "/#review-context"], ["Product overview", "/product"]]
  },
  {
    group: "Download",
    items: [["Windows", "/download"], ["macOS", "/download"], ["Linux", "/download"], ["Changelog", "/changelog"]]
  },
  {
    group: "Pricing",
    items: [["Pilot", "/pricing"], ["Event", "/pricing"], ["Institution", "/pricing"], ["Enterprise", "/pricing"]]
  },
  {
    group: "Docs",
    items: [["Deployment", "/docs"], ["Session review", "/docs"], ["Release notes", "/changelog"], ["Support", "/contact"]]
  },
  {
    group: "Contact",
    items: [["Sales", "/contact"], ["Support", "/contact"], ["Security", "/contact"], ["Privacy", "/contact"]]
  }
];

function MiniDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="h-2 w-2 rounded-full bg-white/20" />
    </div>
  );
}

function MarketingLink({
  href,
  className,
  children
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("#")) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function HeroConsole() {
  return (
    <div className="glass-card ams-hero-console mx-auto mt-11 max-w-6xl overflow-hidden rounded-[0.65rem] md:mt-10">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#09090B] px-4 py-3">
        <MiniDots />
        <div className="ams-label">Controlled Round</div>
        <div className="h-2 w-14 rounded-full bg-white/10" />
      </div>

      {/* Mobile: simplified single-column view */}
      <div className="block md:hidden bg-[#09090B]/50 p-5">
        <p className="ams-label mb-3">Session Context</p>
        <div className="ams-embedded-screen space-y-2 rounded p-4">
          <div className="ams-context-line h-2 w-full rounded bg-white/20" />
          <div className="h-2 w-10/12 rounded bg-white/10" />
          <div className="h-2 w-4/5 rounded bg-white/10" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["Windows", "macOS", "Linux"] as const).map((p) => (
            <div key={p} className="ams-embedded-screen rounded p-3 text-center">
              <PlatformLogo platform={p} className="mx-auto mb-1.5 h-4 w-4 text-white/75" />
              <p className="text-sm font-medium text-white">{p}</p>
              <p className="mt-0.5 text-[10px] text-white/65 md:text-white/40">desktop</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[["Fullscreen","Controlled"],["Timeline","Recording"],["Responses","Saved"],["Review","Ready"]].map(([l,v]) => (
            <div key={l} className="ams-session-indicator rounded border border-white/10 bg-[#09090B] px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-white/65 md:text-white/40">{l}</span>
              <span className="text-[#8B5CF6]">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: full three-column layout */}
      <div className="hidden md:grid min-h-[470px] bg-transparent md:grid-cols-[200px_1fr_280px]">
        <aside className="border-r border-white/10 bg-[#09090B]/50 p-4">
          <div className="mb-6 h-4 w-24 rounded bg-white/10" />
          {["Product", "Desktop Sessions", "Evidence", "Reviewer Workflow", "Downloads"].map((item, index) => (
            <div key={item} className={`mb-2 flex items-center gap-2 rounded px-2 py-2 text-xs ${index === 1 ? "bg-white text-black" : "text-white/60"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${index === 1 ? "ams-status-pulse bg-[#09090B]" : "bg-white/25"}`} />
              {item}
            </div>
          ))}
        </aside>

        <section className="p-6 animate-fade-in-up">
          <div className="mb-7 flex items-start justify-between gap-5">
            <div>
              <p className="ams-label">Session Context</p>
              <h2 className="mt-3 max-w-lg text-3xl font-semibold leading-[1.03] tracking-tight text-white md:text-[2rem]">
                The environment, the work, and the record in one place
              </h2>
            </div>
            <span className="ams-status-pulse rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs text-purple-200">Ready</span>
          </div>
          <div className="ams-embedded-screen space-y-3 rounded p-5">
            <div className="ams-context-line h-2 w-full rounded bg-white/20" />
            <div className="h-2 w-11/12 rounded bg-white/10" />
            <div className="h-2 w-4/5 rounded bg-white/10" />
            <div className="ams-embedded-screen mt-8 h-32 rounded p-4">
              <div className="ams-context-line h-2 w-28 rounded bg-[#8B5CF6]" />
              <div className="mt-4 space-y-2">
                <div className="h-2 rounded bg-white/10" />
                <div className="h-2 w-10/12 rounded bg-white/10" />
                <div className="h-2 w-8/12 rounded bg-white/10" />
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {platformMetrics.map(({ value, label }) => (
              <div key={label} className="ams-embedded-screen rounded p-4">
                <div className="flex items-center gap-2">
                  <PlatformLogo platform={value} className="h-4 w-4 text-white/75" />
                  <p className="text-xl font-medium text-white">{value}</p>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-white/65 md:text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="border-l border-white/10 bg-[#09090B]/50 p-4">
          <p className="ams-label mb-5">Session state</p>
          {[["Fullscreen","Controlled"],["Responses","Saved"],["Timeline","Recording"],["Review","Ready"]].map(([label, value], index) => (
            <div key={label} className="ams-session-indicator mb-3 rounded border border-white/10 bg-[#09090B] px-3 py-3" style={{ "--ams-indicator-delay": `${index * 0.7}s` } as React.CSSProperties}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-white/65 md:text-white/40">{label}</span>
                <span className="text-[#8B5CF6]">{value}</span>
              </div>
            </div>
          ))}
          <div className="mt-6 rounded border border-white/10 bg-[#09090B] p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-white/65 md:text-white/50">
              <span>Round posture</span><span>Controlled</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div className="ams-context-line h-full w-[82%] rounded-full bg-[#8B5CF6]" />
            </div>
          </div>
          <div className="mt-4 rounded border border-white/10 bg-[#09090B] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/35">Review trace</p>
            {["Policy locked","Context recording","Timeline ready"].map((event, index) => (
              <div key={event} className="ams-review-event mb-2 flex items-center justify-between text-xs last:mb-0" style={{ animationDelay: `${index * 1.1}s` }}>
                <span className="text-white/45 typing-effect" style={{ animationDelay: `${index * 0.5}s` }}>{event}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function WorkflowVisual({ kind }: { kind: string }) {
  if (kind === "direction") {
    return (
      <div className="glass-card grid min-h-[260px] grid-cols-[180px_1fr] overflow-hidden rounded">
        <div className="border-r border-white/10 bg-[#09090B]/50 p-4">
          {["Session", "Fullscreen", "Responses", "Timeline", "Review"].map((item, index) => (
            <div key={item} className="mb-3 flex items-center gap-2 text-xs text-white/60">
              <Circle className={`h-2.5 w-2.5 ${index < 3 ? "fill-[#8B5CF6] text-[#8B5CF6]" : "text-white/20"}`} />
              {item}
            </div>
          ))}
        </div>
        <div className="bg-transparent p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-2 w-20 rounded bg-white/10" />
          </div>
          <div className="space-y-3">
            <div className="h-2 rounded bg-[#8B5CF6]/80" />
            <div className="h-2 w-11/12 rounded bg-white/10" />
            <div className="h-2 w-9/12 rounded bg-white/10" />
            <div className="mt-8 h-20 rounded border border-white/10 bg-[#09090B]" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "handoff") {
    return (
      <div className="glass-card grid min-h-[260px] grid-cols-2 overflow-hidden rounded">
        <div className="border-r border-white/10 bg-transparent p-5">
          <p className="mb-4 text-xs text-white/65 md:text-white/50">Review packet</p>
          {["Written response", "Activity timeline", "Session status", "Reviewer note", "Submit time"].map((item) => (
            <div key={item} className="mb-2 flex items-center justify-between rounded border border-white/10 bg-white/[0.025] px-3 py-2 text-xs">
              <span className="text-white/60">{item}</span>
              <Check className="h-3.5 w-3.5 text-[#8B5CF6]" />
            </div>
          ))}
        </div>
        <div className="bg-[#09090B]/50 p-5">
          <p className="mb-4 text-xs text-white/65 md:text-white/50">Reviewer workflow</p>
          {["Ready", "Needs review", "In review", "Cleared"].map((item, index) => (
            <div key={item} className="mb-3 rounded border border-white/10 bg-[#09090B] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">{item}</span>
                <span className="text-white/65 md:text-white/40">{index + 4}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "code") {
    return (
      <div className="glass-card overflow-x-auto overflow-y-hidden rounded bg-transparent p-5 md:overflow-hidden">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs text-white/65 md:text-white/50">
            <Code2 className="h-4 w-4" />
            session-timeline.log
          </div>
          <div className="text-xs text-white/30">Review</div>
        </div>
        <div className="grid min-w-max gap-2 overflow-x-auto font-mono text-[11px] leading-5 md:min-w-0 md:grid-cols-2 md:overflow-visible">
          <div className="ams-log-update rounded bg-red-500/10 p-3 text-red-100/70">
            <p>- fullscreen_exit at 10:24:18</p>
            <p>- tab_hidden at 10:24:20</p>
            <p>- paste at 10:31:04</p>
            <p>- focus_blur at 10:36:51</p>
          </div>
          <div className="ams-log-update rounded bg-emerald-400/10 p-3 text-emerald-100/70" style={{ animationDelay: "1.2s" }}>
            <p>+ answer_autosaved at 10:24:28</p>
            <p>+ fullscreen_enter at 10:24:33</p>
            <p>+ final_answer_saved at 10:47:10</p>
            <p>+ submitted at 10:58:44</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "progress") {
    return (
      <div className="glass-card grid min-h-[280px] gap-5 rounded bg-transparent p-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded border border-white/10 bg-[#09090B] p-4">
          <p className="mb-5 text-xs text-white/65 md:text-white/50">Product coverage</p>
          {metrics.map(({ value, label }) => (
            <div key={label} className="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-white/65 md:text-white/40">{label}</span>
              <span className="text-xl text-white">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-3 rounded border border-white/10 bg-[#09090B] p-5">
          {[42, 72, 34, 86, 58, 68, 47, 92, 63, 76, 39, 83].map((height, index) => (
            <div key={index} className="flex flex-1 flex-col justify-end">
              <div
                className={`rounded-t ${index % 3 === 0 ? "bg-[#8B5CF6]" : index % 3 === 1 ? "bg-cyan-300" : "bg-violet-300"}`}
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <ProductConfigTabs />;
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#000000] text-white">
      <ScrollObserver />
      <header className="fixed inset-x-0 top-4 z-40 px-4 sm:top-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#09090B]/80 px-4 shadow-glass backdrop-blur-2xl sm:px-6">
          <AMSLogo size="nav" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/56 lg:flex">
            {navItems.map(([item, href]) => (
              <MarketingLink key={item} className="transition hover:text-white" href={href}>
                {item}
              </MarketingLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <CommandMenu />
            <Link
              className="ams-cta-primary hidden lg:inline-flex h-9 items-center rounded-full border border-white/25 bg-white px-4 text-sm font-semibold text-[#202020] shadow-[0_4px_14px_rgba(255,255,255,0.1)] hover:bg-violet-500 hover:text-white"
              href="/download"
            >
              Download Access
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      <section className="raycast-hero ams-hero-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-24 pt-32 animate-fade-in-up sm:px-5 sm:pt-32 md:pb-28 md:pt-[10rem] lg:pt-[11rem]">
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-[0.07] blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <h1 className="mx-auto max-w-5xl bg-gradient-to-b from-white via-[#F4F4F5] to-[#A1A1AA] bg-clip-text text-[2.2rem] font-semibold leading-[0.92] tracking-tight text-transparent sm:text-[2.85rem] md:text-[3.75rem] lg:text-[4.85rem]">
            <span className="block">Serious evaluations</span>
            <span className="block">need a room</span>
            <span className="block">of their own.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-lg text-base leading-8 text-slate-200/90 md:mt-6 md:text-[1.05rem] md:leading-8">
            A desktop assessment shell for fullscreen written rounds, activity evidence, and reviewer-ready timelines.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 md:mt-6 md:flex-row md:gap-4">
            <Link className="ams-cta-primary ams-glare relative hidden h-[3.25rem] w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(255,255,255,0.08)] transition-all hover:bg-violet-500 hover:text-white group md:w-auto lg:inline-flex" href="/download">
              <span className="relative z-10 flex items-center gap-2">
                Download AMS Access
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </Link>
            <Link className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full border border-white/70 bg-white px-8 text-center text-[#17171A] shadow-[0_14px_34px_rgba(255,255,255,0.12)] transition hover:bg-purple-100 md:w-auto lg:hidden" href="/download">
              <span className="text-sm font-semibold">Download AMS Access</span>
            </Link>
            <Link className="ams-cta-secondary inline-flex h-[3.25rem] w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-sm font-medium text-white/80 shadow-sm backdrop-blur-md transition-all hover:border-white/35 hover:bg-white/10 hover:text-white md:w-auto" href="/pricing">
              View Pricing
            </Link>
          </div>
          <HeroConsole />
        </div>
      </section>

      <section id="product" className="cv-auto relative isolate mx-auto max-w-6xl border-t border-white/10 px-4 py-16 sm:px-5 sm:py-24 md:py-32 animate-fade-in-up">
        <div className="mb-10 grid gap-8 md:mb-14 md:grid-cols-[1.12fr_0.88fr]">
          <h2 className="max-w-2xl text-3xl font-semibold leading-[0.98] tracking-tight text-white sm:text-4xl md:text-6xl">
            Give the round a boundary.
          </h2>
          <div className="max-w-lg md:pt-4">
            <p className="text-base leading-8 text-white/56">
              Not an LMS. Not a contest portal. Not a form with stricter language. A product surface for evaluations where process matters.
            </p>
            <a className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-purple-200/80 transition hover:text-white" href="#review-context">
              See review context
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="relative grid gap-6 md:grid-cols-[1.18fr_0.91fr_0.91fr]">
          <div className="pointer-events-none absolute inset-x-4 top-10 -z-10 h-72 rounded-full bg-violet-500/10 blur-[120px]" />
          {foundation.map((item, index) => (
            <article
              key={item.title}
              className={`glass-card ams-foundation-card group flex flex-col p-8 animate-fade-in-up ${index === 0 ? "md:p-10" : ""}`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="ams-foundation-mockup relative mb-6 flex h-32 items-center justify-center overflow-hidden rounded">
                {index === 0 && (
                  <div className="flex h-full w-full flex-col justify-end p-4 font-mono text-[10px] leading-relaxed text-[#A1A1AA]">
                    <p className="text-[#D4D4D8] transition-opacity duration-300 group-hover:opacity-100 opacity-50">{`> initializing desktop shell...`}</p>
                    <p className="mt-1 text-[#D4D4D8] transition-opacity duration-300 delay-100 group-hover:opacity-100 opacity-50">{`> preparing fullscreen session... `}<span className="text-emerald-400 group-hover:animate-pulse">[OK]</span></p>
                    <p className="mt-1 text-purple-400 transition-opacity duration-300 delay-200 group-hover:opacity-100 opacity-50">{`> access by ams ready `}<span className="animate-pulse text-white">_</span></p>
                  </div>
                )}
                {index === 1 && (
                  <div className="flex w-full items-center gap-3 px-4">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-purple-300/35 bg-purple-500/10 shadow-[0_0_12px_rgba(139,92,246,0.18)] transition-transform duration-500 group-hover:scale-110">
                      <div className="absolute inset-0 animate-pulse-ring rounded-full border border-purple-300/70" />
                      <ShieldCheck className="h-5 w-5 text-purple-200" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-2 w-16 rounded bg-white/40 transition-all duration-300 group-hover:bg-white/60 group-hover:w-20" />
                      <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.3)] opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                        Evidence captured
                      </div>
                    </div>
                  </div>
                )}
                {index === 2 && (
                  <div className="flex h-full w-full flex-col justify-between p-4 transition-transform duration-500 group-hover:-translate-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#A1A1AA] transition-colors group-hover:text-white">Timeline</span>
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] delay-75 transition-transform group-hover:scale-150" />
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)] delay-150 transition-transform group-hover:scale-150" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                      </div>
                    </div>
                    <div className="flex h-10 w-full items-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {[4, 7, 3, 8, 5, 6, 4, 9, 6, 7].map((h, i) => (
                        <div key={i} className="flex-1 animate-scale-y rounded-t-sm bg-purple-300/70 shadow-[0_0_5px_rgba(139,92,246,0.16)]" style={{ height: `${h * 10}%`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <h3 className={`${index === 0 ? "text-lg" : "text-sm"} font-semibold tracking-tight text-white`}>{item.title}</h3>
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#A1A1AA]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cv-auto mx-auto max-w-6xl border-y border-white/10 px-4 py-16 sm:px-5 sm:py-24 md:py-28 animate-fade-in-up">
        <div className="grid gap-8 md:gap-14 md:grid-cols-[0.74fr_1.26fr]">
          <div>
            <p className="ams-label mb-6">Worldview</p>
            <h2 className="max-w-lg text-3xl font-semibold leading-[0.98] tracking-tight text-white sm:text-4xl md:text-6xl">
              Submissions are not enough.
            </h2>
          </div>
          <div className="max-w-2xl text-xl leading-9 text-white/58 md:pt-14">
            <p>
              A serious evaluation is more than an answer file. It is the environment the candidate worked inside, the interruptions around the work, and the evidence a reviewer can trust later.
            </p>
            <p className="mt-6">
              Access by AMS exists because high-trust rounds deserve review context, not just a final submission.
            </p>
          </div>
        </div>
      </section>

      <section className="cv-auto mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-20 md:py-28 animate-fade-in-up">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="ams-label mb-4">Built for</p>
            <h2 className="max-w-2xl text-2xl font-semibold leading-[1.05] tracking-tight text-white sm:text-3xl md:text-5xl">
              The rounds where context changes the decision.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-white/65 md:text-white/50">
            Each format carries pressure: fairness, auditability, reviewer time, and deployment clarity.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map(([title, body], index) => (
            <article
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] animate-fade-in-up"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-4 text-xs leading-6 text-white/65 md:text-white/50">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-purple-300/[0.15] bg-purple-500/[0.055] p-5 md:flex md:items-center md:justify-between md:gap-6">
          <p className="text-sm leading-7 text-purple-100/75">
            Start with the plan shape: pilot, event, institution, or custom deployment. The product path stays operational, not performative.
          </p>
          <a className="mt-4 inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-white transition hover:text-purple-100 md:mt-0" href="#pricing">
            Compare plans
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {workflowSections.map((section, idx) => (
        <section id={idx === 1 ? "review-context" : undefined} key={section.title} className={`cv-auto mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-24 md:py-36 animate-fade-in-up ${idx === 0 ? "border-t border-white/5" : ""}`}>
          <div className={`mb-8 grid gap-6 ${idx % 2 === 0 ? "md:grid-cols-[0.86fr_1.14fr]" : "md:grid-cols-[1.12fr_0.88fr]"}`}>
            <div>
              <p className="ams-label mb-4">{section.eyebrow}</p>
              <h2 className="max-w-xl text-2xl font-semibold leading-[1.05] tracking-tight text-white sm:text-3xl md:text-5xl">{section.title}</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/65 md:pt-10 md:text-white/50">{section.body}</p>
          </div>
          <WorkflowVisual kind={section.visual} />
          <a
            className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-purple-200/75 transition hover:text-white"
            href={idx === 0 ? "#review-context" : "#pricing"}
          >
            {idx === 0 ? "See review context" : "View pricing"}
            <ArrowRight className="h-4 w-4" />
          </a>
        </section>
      ))}

      <section className="cv-auto mx-auto max-w-6xl px-4 py-10 sm:px-5 md:py-14 animate-fade-in-up">
        <div className="rounded-2xl border border-white/10 bg-[#09090B] p-6 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <p className="ams-label mb-3">Positioning</p>
            <p className="max-w-2xl text-lg leading-8 text-white/[0.78]">
              Not surveillance. Not a browser plugin. A desktop shell for serious written rounds.
            </p>
          </div>
          <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-purple-100 md:mt-0" href="#pricing">
            Compare plans
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section id="pricing" className="cv-auto mx-auto max-w-6xl border-t border-white/5 px-4 py-14 sm:px-5 sm:py-24 md:py-32 animate-fade-in-up">
        <div className="mb-10 grid gap-6 md:mb-14 md:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="ams-label mb-4">Pricing</p>
            <h2 className="max-w-xl text-2xl font-semibold leading-[1.05] tracking-tight text-white sm:text-3xl md:text-5xl">
              For rounds with consequence.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/65 md:pt-10 md:text-white/50">
            Plans follow the shape of the evaluation: pilot, event, institution, or custom deployment.
          </p>
        </div>
        <LazyMount rootMargin="300px" minHeight={320}>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {pricingPlans.map(([title, bestFor, body, detail], index) => (
              <SpotlightCard
                key={title}
                featured={index === 2}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-100/70">
                  {bestFor}
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-4 text-sm leading-6 text-white/60">{body}</p>
                <p className="mt-8 border-t border-white/10 pt-4 text-xs leading-5 text-white/65 md:text-white/40">{detail}</p>
              </SpotlightCard>
            ))}
          </div>
        </LazyMount>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <p className="max-w-xl text-sm leading-7 text-white/65 md:text-white/50">
            Compare the plan around your evaluation window, review load, and deployment path.
          </p>
          <Link className="ams-cta-primary inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-violet-500 hover:text-white" href="/pricing">
            Compare Plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Link className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-purple-200/75 transition hover:text-white" href="/docs">
          Read deployment docs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section id="download" className="cv-auto mx-auto max-w-6xl border-t border-white/5 px-4 py-14 sm:px-5 sm:py-24 md:py-32 animate-fade-in-up">
        <div className="glass-card ams-card-featured grid overflow-hidden md:grid-cols-[1.16fr_0.84fr]">
          <div className="relative overflow-hidden bg-[#050505] p-8 text-white md:p-12">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_100%_100%,_rgba(139,92,246,0.08),_transparent_50%)]" />
            <div className="ams-noise pointer-events-none absolute inset-0 opacity-[0.35]" />
            <div className="relative z-10">
              <p className="ams-label">
                <span className="lg:hidden">Desktop availability</span>
                <span className="hidden lg:inline">Download</span>
              </p>
              <h2 className="mt-5 max-w-lg text-2xl font-semibold tracking-tight leading-[1.05] sm:text-3xl md:text-5xl">
                Put the environment in their hands.
              </h2>
              <p className="mt-8 hidden max-w-md text-sm leading-7 text-white/65 md:text-white/50 lg:block">
                Versioned builds for Windows, macOS, and Linux make deployment legible for technical teams.
              </p>
              <p className="mt-8 max-w-md text-sm leading-7 text-white/65 md:text-white/50 lg:hidden">
                Access by AMS is available for desktop environments: Windows, macOS, and Linux.
              </p>
              <Link className="ams-cta-primary mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-violet-500 hover:text-white" href="/docs">
                Read Deployment Docs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="bg-transparent p-6 md:p-8">
            {downloadPlatforms.map(([platform, title, body], index) => (
              <div
                key={platform}
                className="mb-4 rounded border border-white/10 bg-white/[0.025] p-4 animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{platform}</p>
                    <p className="mt-1 text-xs text-white/65 md:text-white/40">{title}</p>
                  </div>
                  <PlatformLogo platform={platform} className="h-4 w-4 text-white/75 lg:hidden" />
                  <Download className="hidden h-4 w-4 text-white/40 lg:block" />
                </div>
                <p className="mt-4 text-xs leading-5 text-white/65 md:text-white/50">{body}</p>
              </div>
            ))}
            <div id="docs" className="rounded border border-white/10 bg-[#09090B] p-4 text-xs leading-5 text-white/45">
              Includes release notes, deployment context, and documentation paths for review operations.
            </div>
            <Link className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-purple-200/75 transition hover:text-white" href="/changelog">
              View changelog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="changelog" className="cv-auto border-y border-white/10 animate-fade-in-up">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-24">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="ams-label mb-4">Release Notes</p>
              <h2 className="max-w-xl text-2xl font-semibold leading-[1.05] tracking-tight text-white sm:text-3xl md:text-5xl">Change should be visible.</h2>
            </div>
            <div className="max-w-md">
              <p className="text-sm leading-7 text-white/45">Operational teams need to know what changed before the next round begins.</p>
              <Link className="ams-cta-secondary mt-6 inline-flex h-10 items-center justify-center rounded-full border border-white/10 px-4 text-xs font-medium text-white/65 hover:border-white/40 hover:text-white" href="/changelog">
                View Changelog
              </Link>
            </div>
          </div>
          <LazyMount rootMargin="200px" minHeight={170}>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:mt-14 md:mt-16 md:grid-cols-4">
              {changelog.map(([title, body], index) => (
                <SpotlightCard
                  key={title}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="mb-4 h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
                  <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
                  <p className="mt-3 text-xs leading-5 text-white/65 md:text-white/50">{body}</p>
                </SpotlightCard>
              ))}
            </div>
          </LazyMount>
        </div>
      </section>

      <section className="cv-auto mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-5 sm:pb-24 sm:pt-24 md:pb-32 md:pt-32 animate-fade-in-up">
        <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight leading-[0.94] text-white sm:text-5xl md:text-7xl">
          Bring the round under control.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link className="ams-cta-primary ams-glare relative inline-flex overflow-hidden rounded-full bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-violet-500 hover:text-white group" href="/pricing">
            <span className="relative z-10">Compare Plans</span>
          </Link>
          <Link className="ams-cta-secondary rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white/60 hover:border-white/40 hover:text-white" href="/contact">
            Contact Sales
          </Link>
        </div>
      </section>

      <footer id="contact" className="cv-auto border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-xs text-white/65 sm:px-5 sm:py-12 md:text-white/40 grid-cols-2 md:grid-cols-[1.2fr_repeat(5,1fr)]">
          <div>
            <AMSLogo />
            <p className="mt-5 max-w-xs leading-5">Access by AMS. Controlled environments and review context for high-trust evaluations.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#09090B] px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              All systems operational
            </div>
          </div>
          {footerGroups.map(({ group, items }) => (
            <div key={group}>
              <p className="mb-4 text-white/70">{group}</p>
              <div className="grid gap-2">
                {items.map(([item, href]) => (
                  <MarketingLink key={item} className="transition hover:text-white" href={href}>
                    {item}
                  </MarketingLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}
