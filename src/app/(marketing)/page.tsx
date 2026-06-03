"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Download, Maximize2, X } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";
import { FooterCTASection } from "@/components/FooterCTASection";

type ZoomImage = {
  src: string;
  alt: string;
};

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [zoomImage, setZoomImage] = useState<ZoomImage | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!zoomImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setZoomImage(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [zoomImage]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-purple-200 selection:text-purple-900 overflow-x-hidden">
      <MarketingHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-medium tracking-tight text-slate-900 leading-[1.05] mb-10 max-w-4xl mx-auto">
            Experience liftoff with the next-gen evaluation platform
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/download"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-8 text-sm font-medium text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Download Access
            </Link>
            <Link
              href="/#use-cases"
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-100 px-8 text-sm font-medium text-slate-900 transition-all hover:bg-slate-200"
            >
              Explore use cases
            </Link>
          </div>
        </div>
      </section>

      {/* Workspace Section */}
      <section id="product" className="py-24 md:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="max-w-md">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-slate-900 mb-6">
                AMS Access Workspace
              </h2>
              <p className="text-slate-600 leading-relaxed mb-8">
                The fully-featured, controlled workspace. Complete with the session manager, review timeline, and a deep understanding of your evaluation round.
              </p>
              <Link
                href="#product"
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                Explore Product
              </Link>
            </div>

            {/* App screenshot */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500 rounded-2xl blur opacity-30"></div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-200">
                <img
                  src="/Contestant Hub Demo Page.png"
                  alt="AMS Access Contestant Hub"
                  className="w-full h-auto block"
                />
                <button
                  type="button"
                  onClick={() =>
                    setZoomImage({
                      src: "/Contestant Hub Demo Page.png",
                      alt: "AMS Access Contestant Hub",
                    })
                  }
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/75 text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
                  aria-label="View AMS Access Contestant Hub image"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contestant Editor Section */}
      <section className="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/40 via-transparent to-orange-100/40 opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="max-w-md order-2 md:order-1">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-slate-900 mb-6">
                The controlled contest environment
              </h2>
              <p className="text-slate-600 leading-relaxed mb-8">
                Contestants work inside a locked desktop shell — problem statement, code editor, and live output side by side. Every keystroke is captured, every tab switch logged, every fullscreen exit flagged. The session is proctored from the moment it opens.
              </p>
              <ul className="space-y-3 text-sm text-slate-500">
                {[
                  "Face detection & camera feed throughout the session",
                  "Key interception prevents external tool usage",
                  "Real-time integrity timeline for reviewers",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Editor screenshot */}
            <div className="order-1 md:order-2 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-slate-800 rounded-2xl blur opacity-25"></div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-800/40">
                <img
                  src="/App Window - Editor.png"
                  alt="AMS Access proctored contest editor"
                  className="w-full h-auto block"
                />
                <button
                  type="button"
                  onClick={() =>
                    setZoomImage({
                      src: "/App Window - Editor.png",
                      alt: "AMS Access proctored contest editor",
                    })
                  }
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/75 text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
                  aria-label="View AMS Access proctored contest editor image"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section id="use-cases" className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-24 relative">

            {/* Decorative Brackets background removed as requested */}
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-50 scale-150 md:scale-100">
            </div>

            <div className="flex flex-col items-center text-center p-8 relative z-10 bg-white/60 backdrop-blur-sm rounded-3xl">
              <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full mb-6 border border-slate-200">
                Available at no charge
              </div>
              <h2 className="text-3xl font-medium text-slate-900 mb-2">For evaluators</h2>
              <h3 className="text-3xl font-medium text-slate-500 mb-8">Achieve new heights</h3>
              <Link
                href="/download"
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-8 text-sm font-medium text-white shadow-md transition-transform hover:scale-105"
              >
                Download
              </Link>
            </div>

            <div className="flex flex-col items-center text-center p-8 relative z-10 bg-white/60 backdrop-blur-sm rounded-3xl">
              <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full mb-6 border border-slate-200">
                Now Available!
              </div>
              <h2 className="text-3xl font-medium text-slate-900 mb-2">For organizations</h2>
              <h3 className="text-3xl font-medium text-slate-500 mb-8">Level up your entire team</h3>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-8 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
              >
                Read More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FooterCTASection />
      <MarketingFooter />

      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={zoomImage.alt}
          onClick={() => setZoomImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close image viewer"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={zoomImage.src}
            alt={zoomImage.alt}
            className="max-h-[88vh] max-w-[94vw] rounded-lg border border-white/10 object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
