"use client";

import dynamic from "next/dynamic";

const FirmsPortal = dynamic(() => import("@/firms/FirmsPortal"), {
  ssr: false,
  loading: () => (
    <div className="firms-theme flex min-h-[100dvh] items-center justify-center bg-bg text-sm text-muted">
      Loading firms portal…
    </div>
  ),
});

export function FirmsPortalMount() {
  return <FirmsPortal />;
}
