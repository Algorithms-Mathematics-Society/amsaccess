"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/client/apiClient";
import { slugify } from "@/domain/cms";

export default function NewAssessmentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState<string | null>(null);

  async function createAssessment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiFetch<{ id: string }>("/api/admin/assessments", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          slug: `${slugify(title)}-${Date.now()}`,
          status: "DRAFT",
          duration_minutes: duration,
          is_active: false,
          allowed_browsers: [],
          allowed_devices: [],
        }),
      });
      router.push(`/admin/assessments/${data.id}/edit`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Create failed.");
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <Link href="/admin/assessments" className="text-sm text-purple-300">Back</Link>
      <h1 className="mt-2 text-2xl text-white">New Assessment</h1>
      {error ? <p className="mt-3 text-red-400">{error}</p> : null}
      <form onSubmit={createAssessment} className="mt-4 space-y-3">
        <input className="glass-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <input className="glass-input w-full" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        <button className="rounded bg-white px-3 py-2 text-black">Create</button>
      </form>
    </main>
  );
}
