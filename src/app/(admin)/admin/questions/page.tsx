"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client/apiClient";

type Question = { id: string; title: string; type: string; status: string };

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void apiFetch<Question[]>("/api/admin/questions").then(setQuestions).catch(() => setQuestions([]));
  }, []);

  const filtered = useMemo(() => questions.filter((q) => q.title.toLowerCase().includes(query.toLowerCase())), [questions, query]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl text-white">Question Bank</h1>
        <Link href="/admin/questions/new" className="rounded bg-white px-3 py-2 text-black">New</Link>
      </div>
      <input className="glass-input mb-4 w-full" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
      <div className="space-y-2">
        {filtered.map((q) => (
          <div key={q.id} className="glass-card flex items-center justify-between p-3">
            <div><p className="text-white">{q.title}</p><p className="text-xs text-white/60">{q.type} · {q.status}</p></div>
            <Link href={`/admin/questions/${q.id}/edit`} className="text-sm text-purple-300">Edit</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
