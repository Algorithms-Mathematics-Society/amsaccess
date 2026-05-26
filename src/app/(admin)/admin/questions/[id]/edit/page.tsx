"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/apiClient";

type Asset = { id: string; filename: string; storage_path: string; public_url?: string; alt_text?: string; caption?: string };
type Question = { id: string; title: string; statement: string; type: string; status: string; assets?: Asset[] };

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const [q, setQ] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await apiFetch<Question>(`/api/admin/questions/${id}`);
      setQ(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!q) return;
    try {
      await apiFetch(`/api/admin/questions/${id}`, { method: "PATCH", body: JSON.stringify(q) });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Save failed.");
    }
  }

  async function uploadAsset(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    try {
      await apiFetch(`/api/admin/questions/${id}/assets`, { method: "POST", body: fd });
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Upload failed.");
    }
  }

  if (!q) return <main className="px-6 py-8 text-white">Loading...</main>;
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/admin/questions" className="text-sm text-purple-300">Back</Link>
      <h1 className="mt-2 text-2xl text-white">{q.title}</h1>
      {error ? <p className="mt-3 text-red-400">{error}</p> : null}
      <form onSubmit={save} className="mt-4 space-y-3">
        <input className="glass-input w-full" value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} />
        <textarea className="glass-input min-h-48 w-full" value={q.statement} onChange={(e) => setQ({ ...q, statement: e.target.value })} />
        <div className="flex items-center gap-3">
          <input type="file" onChange={uploadAsset} />
          <button className="rounded bg-white px-3 py-2 text-black">Save</button>
        </div>
      </form>
      <div className="mt-4 space-y-2">
        {(q.assets ?? []).map((a) => (
          <div key={a.id} className="glass-card p-3 text-white">{a.filename}</div>
        ))}
      </div>
    </main>
  );
}
