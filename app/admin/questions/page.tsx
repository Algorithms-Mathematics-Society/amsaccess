"use client";

import { Edit, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QUESTION_TYPES } from "@/lib/cms";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Question } from "@/lib/types";
import { TableSkeleton } from "@/components/Skeleton";

const typeLabel = Object.fromEntries(QUESTION_TYPES);

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      if (!isSupabaseConfigured) {
        setError("Supabase is not configured.");
        setIsLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("questions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (loadError) {
        setError(loadError.message);
      } else {
        setQuestions((data ?? []) as Question[]);
      }
      setIsLoading(false);
    }

    void loadQuestions();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return questions.filter((question) => {
      const matchesQuery =
        !needle ||
        question.title.toLowerCase().includes(needle) ||
        (question.short_code ?? "").toLowerCase().includes(needle) ||
        (question.tags ?? []).some((tag) => tag.toLowerCase().includes(needle));
      const matchesStatus = !status || question.status === status;
      const matchesType = !type || question.type === type;
      const matchesDifficulty = !difficulty || question.difficulty === difficulty;
      return matchesQuery && matchesStatus && matchesType && matchesDifficulty;
    });
  }, [difficulty, query, questions, status, type]);

  return (
    <main className="relative min-h-screen px-5 py-6">
      <div className="ams-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link className="text-sm text-purple-400" href="/admin">Admin</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Question Bank</h1>
            <p className="text-sm text-white/60">Reusable reasoning questions for AMS Derive rounds.</p>
          </div>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:brightness-110"
            href="/admin/questions/new"
          >
            <Plus className="h-4 w-4" />
            New question
          </Link>
        </header>

        {error ? <div className="mb-5 rounded border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}

        <section className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px_220px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, code, or tags"
              className="h-11 w-full rounded border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-purple-500/60"
            />
          </div>
          <select className="glass-input h-11 py-0" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select className="glass-input h-11 py-0" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All types</option>
            {QUESTION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="glass-input h-11 py-0" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">All difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </section>

        <section className="overflow-hidden glass-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-white/60">
                <tr>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Edit</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton cols={7} rows={4} />
                ) : filtered.length ? (
                  filtered.map((question) => (
                    <tr key={question.id} className="border-b border-white/10 last:border-0">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{question.title}</div>
                        <div className="mt-1 text-xs text-white/50">{question.short_code ?? "No code"} · {(question.tags ?? []).join(", ") || "No tags"}</div>
                      </td>
                      <td className="px-4 py-4 text-white/60">{typeLabel[question.type] ?? question.type}</td>
                      <td className="px-4 py-4 text-white/60">{question.difficulty}</td>
                      <td className="px-4 py-4 text-white">{question.max_score}</td>
                      <td className="px-4 py-4">
                        <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/80">{question.status}</span>
                      </td>
                      <td className="px-4 py-4 text-white/50">{question.updated_at ? new Date(question.updated_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-4">
                        <Link className="inline-flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-xs text-white/80 transition hover:border-purple-500/50" href={`/admin/questions/${question.id}/edit`}>
                          <Edit className="h-4 w-4" />
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-4 py-6 text-white/60" colSpan={7}>No questions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
