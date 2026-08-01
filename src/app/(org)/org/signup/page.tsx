"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stage = "details" | "confirm";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

export default function SignUpPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { confirmed } = await post<{ confirmed: boolean }>("/api/auth/signup", {
        email: email.trim(),
        password,
        display_name: displayName.trim(),
      });
      // A pool configured to auto-confirm skips the code entirely; going
      // straight to sign-in avoids asking for something that never arrives.
      if (confirmed) {
        router.push("/org/login");
        return;
      }
      setStage("confirm");
      setNotice(`We emailed a confirmation code to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/auth/confirm", { email: email.trim(), code: code.trim() });
      await post("/api/auth/login", { email: email.trim(), password });
      router.push("/org/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm the account.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    try {
      await post("/api/auth/confirm", { email: email.trim(), resend: true });
      setNotice("Sent another code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    }
  }

  return (
    <main className="light flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">
          {stage === "details" ? "Create an account" : "Confirm your email"}
        </h1>

        {notice && <p className="mt-2 text-sm text-slate-500">{notice}</p>}

        {stage === "details" ? (
          <form onSubmit={createAccount} className="mt-6 space-y-4">
            <Field label="Name" value={displayName} onChange={setDisplayName} autoFocus />
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Password" type="password" value={password} onChange={setPassword} />
            <p className="text-xs text-slate-500">At least 8 characters.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || !email.trim() || password.length < 8}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        ) : (
          <form onSubmit={confirm} className="mt-6 space-y-4">
            <Field label="Confirmation code" value={code} onChange={setCode} autoFocus />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? "Confirming…" : "Confirm and sign in"}
            </button>
            <button
              type="button"
              onClick={resend}
              className="w-full text-sm text-slate-500 hover:text-slate-900"
            >
              Send another code
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/org/login" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
    </div>
  );
}
