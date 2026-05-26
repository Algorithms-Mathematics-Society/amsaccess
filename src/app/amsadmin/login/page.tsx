"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AmsAdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/amsadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials.");
      router.push("/amsadmin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-semibold text-white">AMS Admin Login</h1>
      <div className="mt-6 space-y-3">
        <input className="glass-input w-full" placeholder="Username" value={user} onChange={(e) => setUser(e.target.value)} />
        <input className="glass-input w-full" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className="rounded bg-white px-4 py-2 text-black" onClick={() => void submit()} disabled={loading}>
          {loading ? "Checking..." : "Sign in"}
        </button>
      </div>
    </main>
  );
}
