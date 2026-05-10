"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
          <div className="max-w-md rounded border border-red-400/30 bg-red-500/10 p-6 text-center">
            <p className="text-lg font-semibold">The app could not load.</p>
            <p className="mt-2 text-sm text-red-100/80">Please retry in a moment.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Retry
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
