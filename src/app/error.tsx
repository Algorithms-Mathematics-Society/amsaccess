"use client";

import { RefreshCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
      <div className="max-w-md rounded border border-red-400/30 bg-red-500/10 p-6 text-center">
        <p className="text-lg font-semibold">Something went wrong.</p>
        <p className="mt-2 text-sm text-red-100/80">{error.message || "Please retry the request."}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-white px-4 text-sm font-semibold text-black transition hover:bg-[#8B5CF6] hover:text-white"
        >
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </main>
  );
}
