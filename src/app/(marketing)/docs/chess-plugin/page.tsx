import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function ChessPluginDocsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />

      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-slate-50/30 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Link
            href="/docs"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Docs
          </Link>


          <h1 className="text-4xl font-medium tracking-tight text-slate-900 md:text-5xl">
            Chess Plugin Docs
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
            This guide is being prepared. Contact the team for the current operating reference.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800"
          >
            Contact team
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
