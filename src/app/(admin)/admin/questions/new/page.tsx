"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/client/apiClient";

export default function NewQuestionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createQuestion(e: FormEvent) {
    e.preventDefault();
    try {
      const data = await apiFetch<{ id: string }>("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify({ title, statement: "", type: "WRITTEN_REASONING", status: "DRAFT" }),
      });
      router.push(`/admin/questions/${data.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <Link href="/admin/questions" className="text-sm text-purple-300">Back</Link>
      <h1 className="mt-2 text-2xl text-white">New Question</h1>
      {error ? <p className="mt-3 text-red-400">{error}</p> : null}
      <form onSubmit={createQuestion} className="mt-4 space-y-3">
        <input className="glass-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <button className="rounded bg-white px-3 py-2 text-black">Create</button>
      </form>
    </main>
  );
}
