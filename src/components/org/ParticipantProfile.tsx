"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { formatWhen, relativeWhen, statusClass } from "@/lib/orgTypes";
import { verdictClass } from "@/lib/contestTypes";

type TagStat = { tag: string; solved: number; attempted: number };
type VerdictCount = { verdict: string; count: number };
type ActivityDay = { day: string; submissions: number; solved: number };

type ProfileContest = {
  uid: string;
  title: string;
  starts_at: string;
  status: string;
  is_practice: boolean;
  solved: number;
  attempted: number;
  submissions: number;
};

type ProfileSubmission = {
  uid: string;
  created_at: string;
  verdict: string;
  status: string;
  language: string;
  problem_title: string;
  problem_label: string;
  contest_uid: string | null;
  contest_title: string;
  score: number;
  max_runtime_ms: number;
};

export type Profile = {
  uid: string;
  handle: string;
  display_name: string;
  email: string;
  mailable: boolean;
  status: string;
  college: string;
  branch: string;
  graduation_year: number | null;
  linkedin_url: string;
  github_url: string;
  has_resume_file: boolean;
  phone: string;
  location: string;
  external_ref: string;
  notes: string;
  created_at: string;
  contests_entered: number;
  problems_solved: number;
  submissions_total: number;
  accepted_total: number;
  contests: ProfileContest[];
  submissions: ProfileSubmission[];
  tags: TagStat[];
  verdicts: VerdictCount[];
  activity: ActivityDay[];
};

export function ParticipantProfile({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/org/students/${encodeURIComponent(handle)}/profile`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) setError((data as { error?: string }).error ?? "Could not load this profile.");
        else setProfile(data as Profile);
      } catch {
        if (!cancelled) setError("Could not load this profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (error) {
    return (
      <div className="px-8 py-6">
        <BackLink />
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }
  if (!profile) return <p className="px-8 py-6 text-sm text-slate-500">Loading…</p>;

  const accuracy =
    profile.submissions_total > 0
      ? Math.round((profile.accepted_total / profile.submissions_total) * 100)
      : null;

  return (
    <div className="px-8 py-6">
      <BackLink />

      {/* ── identity ──────────────────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-950">{profile.display_name}</h1>
            {/* The handle is the participant's ID — it is on their slip and in
                their credential email, so it is shown as the primary identifier
                rather than the uuid nobody can read out. */}
            <p className="mt-0.5 font-mono text-sm text-slate-500">{profile.handle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
              {profile.college && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {profile.college}
                  {profile.branch && <span className="text-slate-400">· {profile.branch}</span>}
                  {profile.graduation_year && (
                    <span className="text-slate-400">· {profile.graduation_year}</span>
                  )}
                </span>
              )}
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {profile.location}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {profile.mailable ? (
                  <span className="font-mono text-slate-600">{profile.email}</span>
                ) : (
                  <span className="text-amber-700">no email — cannot be sent a login</span>
                )}
              </span>
              {profile.phone && (
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {profile.phone}
                </span>
              )}
              {profile.external_ref && (
                <span className="font-mono text-slate-400">{profile.external_ref}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile.linkedin_url && <IconLink href={profile.linkedin_url} label="LinkedIn" icon={<Linkedin className="h-3.5 w-3.5" />} />}
            {profile.github_url && <IconLink href={profile.github_url} label="GitHub" icon={<Github className="h-3.5 w-3.5" />} />}
            {profile.has_resume_file && (
              <IconLink
                href={`/api/org/students/${profile.uid}/resume`}
                label="Resume"
                icon={<FileText className="h-3.5 w-3.5" />}
              />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
          <Stat label="Contests" value={profile.contests_entered} />
          <Stat label="Problems solved" value={profile.problems_solved} />
          <Stat label="Submissions" value={profile.submissions_total} />
          <Stat
            label="Accepted"
            value={accuracy === null ? "—" : `${accuracy}%`}
            hint={accuracy === null ? "no submissions yet" : `${profile.accepted_total} of ${profile.submissions_total}`}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Contests" count={profile.contests.length}>
            {profile.contests.length === 0 ? (
              <Empty>Not registered for any contest yet.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {profile.contests.map((contest) => (
                  <li key={contest.uid} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Link
                      href={`/org/contests/${contest.uid}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 hover:underline"
                    >
                      {contest.title}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusClass(contest.status)}`}>
                      {contest.status}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {contest.solved}/{contest.attempted} solved · {contest.submissions} submissions
                    </span>
                    <span className="text-xs text-slate-400">{relativeWhen(contest.starts_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Submissions" count={profile.submissions.length}>
            {profile.submissions.length === 0 ? (
              <Empty>No submissions yet.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {profile.submissions.map((submission) => (
                  <li key={submission.uid} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className={`w-12 flex-shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-medium ${verdictClass(submission.verdict)}`}>
                      {submission.verdict || "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                      {submission.problem_label && (
                        <span className="font-mono text-slate-400">{submission.problem_label} </span>
                      )}
                      {submission.problem_title || "Unknown problem"}
                    </span>
                    <span className="text-xs text-slate-400">{submission.contest_title}</span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {submission.max_runtime_ms ? `${submission.max_runtime_ms} ms` : ""}
                    </span>
                    <span className="text-xs text-slate-400">{formatWhen(submission.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Topics" count={profile.tags.length}>
            {profile.tags.length === 0 ? (
              <Empty>No tagged problems attempted yet.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {profile.tags.map((tag) => (
                  <li key={tag.tag}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-slate-700">{tag.tag}</span>
                      <span className="flex-shrink-0 tabular-nums text-slate-500">
                        {tag.solved}/{tag.attempted}
                      </span>
                    </div>
                    <Bar value={tag.solved} total={tag.attempted} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Verdicts" count={profile.verdicts.length}>
            {profile.verdicts.length === 0 ? (
              <Empty>Nothing judged yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {profile.verdicts.map((entry) => (
                  <li key={entry.verdict} className="flex items-center gap-2">
                    <span className={`w-12 flex-shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-medium ${verdictClass(entry.verdict)}`}>
                      {entry.verdict}
                    </span>
                    <Bar value={entry.count} total={profile.submissions_total} />
                    <span className="w-8 flex-shrink-0 text-right text-xs tabular-nums text-slate-500">
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Activity" count={profile.activity.length}>
            {profile.activity.length === 0 ? (
              <Empty>No activity recorded.</Empty>
            ) : (
              <Activity days={profile.activity} />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/org/participants"
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Participants
    </Link>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-xl font-semibold tabular-nums text-slate-950">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {count > 0 && <span className="text-xs tabular-nums text-slate-400">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-slate-400">{children}</p>;
}

/** A proportion. Zero total renders empty rather than dividing by it. */
function Bar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <span className="block h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * Submissions per day.
 *
 * Scaled against the busiest day rather than a fixed ceiling, so a quiet
 * month still reads as a shape instead of a flat line — the question this
 * answers is "when did they work", not "how do they compare to a constant".
 */
function Activity({ days }: { days: ActivityDay[] }) {
  const peak = Math.max(...days.map((d) => d.submissions), 1);
  return (
    <div className="flex h-24 items-end gap-0.5 overflow-x-auto">
      {days.map((day) => (
        <span
          key={day.day}
          title={`${day.day}: ${day.submissions} submission${day.submissions === 1 ? "" : "s"}, ${day.solved} solved`}
          className="flex min-w-[6px] flex-1 flex-col justify-end"
          style={{ height: "100%" }}
        >
          <span
            className="w-full rounded-sm bg-slate-300"
            style={{ height: `${Math.max(6, (day.submissions / peak) * 100)}%` }}
          >
            <span
              className="block w-full rounded-sm bg-emerald-500"
              style={{ height: `${day.submissions > 0 ? (day.solved / day.submissions) * 100 : 0}%` }}
            />
          </span>
        </span>
      ))}
    </div>
  );
}

function IconLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-slate-900"
    >
      {icon}
      {label}
    </a>
  );
}
