"use client";

import { RefreshCcw } from "lucide-react";

/** Renders inside the console layout, so navigation stays on screen when a page throws, instead of the site-wide black error page. */
export default function OrgError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // A deploy replaces the JS chunks this page was built from; only a full reload fetches the new ones.
  const staleBuild = error.name === "ChunkLoadError" || /Loading chunk|dynamically imported module/i.test(error.message);
  return (
    <div className="px-4 py-10 sm:px-6 md:px-8">
      <div role="alert" className="max-w-xl rounded-xl border border-red-200 bg-white p-6">
        <h1 className="text-base font-semibold text-slate-950">
          {staleBuild ? "A new version of the console is available" : "This page hit an error"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {staleBuild
            ? "Reload to load it. Nothing you saved is lost."
            : "Try again. If it keeps happening, reload the page; saved work is not affected."}
        </p>
        {!staleBuild && error.message && (
          <p className="mt-2 break-words font-mono text-xs text-slate-500">{error.message}</p>
        )}
        <div className="mt-5 flex gap-2">
          {!staleBuild && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <RefreshCcw className="h-4 w-4" />
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={staleBuild
              ? "rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"}
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
