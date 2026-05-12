"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";

const categories = [
  {
    title: "Sales",
    value: "Sales",
    body: "Discuss plan fit, event scale, and procurement requirements.",
    href: "mailto:sales@amsaccess.com?subject=AMS%20Access%20sales%20conversation"
  },
  {
    title: "Support",
    value: "Support",
    body: "Coordinate deployment and operational questions for assessment teams.",
    href: "mailto:support@amsaccess.com?subject=AMS%20Access%20support"
  },
  {
    title: "Security",
    value: "Security",
    body: "Review product behavior and evidence handling with technical stakeholders.",
    href: "mailto:security@amsaccess.com?subject=AMS%20Access%20security%20review"
  }
] as const;

type Category = (typeof categories)[number]["value"];

export default function ContactPage() {
  const [category, setCategory] = useState<Category>("Sales");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        organization: formData.get("organization"),
        email: formData.get("email"),
        message: formData.get("message"),
        category
      })
    });

    if (!response.ok) {
      setStatus("idle");
      setError("Unable to send right now. Use the direct email links below.");
      return;
    }

    form.reset();
    setCategory("Sales");
    setStatus("sent");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <MarketingHeader />
      <section
        className="raycast-hero relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-5 sm:pt-32"
        style={{
          backgroundImage: "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      >
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-200 backdrop-blur-md">
              Contact
            </div>
            <h1 className="max-w-3xl bg-gradient-to-b from-white to-[#D4D4D8] bg-clip-text text-4xl font-semibold leading-[1.05] tracking-tight text-transparent sm:text-5xl md:text-7xl">
              Talk to AMS Access.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl">
              Contact the team for access, pricing, deployment planning, support paths, and institution evaluation needs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white" href="/pricing">
                View Pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] px-5 text-sm font-medium text-white/75 shadow-glass backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white" href="/">
                Back to Home
              </Link>
            </div>

            <div className="mt-10 grid gap-4">
              {categories.map((item) => (
                <a key={item.title} className="group rounded border border-white/10 bg-[#09090B]/80 p-5 transition hover:border-purple-300/25 hover:bg-white/[0.035]" href={item.href}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold tracking-tight text-white">{item.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-white/65 md:text-white/50">{item.body}</p>
                    </div>
                    <Mail className="h-4 w-4 shrink-0 text-purple-200/70 transition group-hover:text-purple-100" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="glass-card grid content-start gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-medium text-white/60">
                Name
                <input required name="name" className="rounded border border-white/10 bg-[#09090B] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-300/40" />
              </label>
              <label className="grid gap-2 text-xs font-medium text-white/60">
                Organization
                <input name="organization" className="rounded border border-white/10 bg-[#09090B] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-300/40" />
              </label>
            </div>
            <label className="grid gap-2 text-xs font-medium text-white/60">
              Email
              <input required type="email" name="email" className="rounded border border-white/10 bg-[#09090B] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-300/40" />
            </label>
            <label className="grid gap-2 text-xs font-medium text-white/60">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value as Category)} className="rounded border border-white/10 bg-[#09090B] px-4 py-3 text-sm text-white outline-none transition focus:border-purple-300/40">
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.title}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-medium text-white/60">
              Message
              <textarea required name="message" rows={7} className="resize-y rounded border border-white/10 bg-[#09090B] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-purple-300/40" />
            </label>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            {status === "sent" ? <p className="text-sm text-emerald-300">Message received. The team will follow up by email.</p> : null}
            <button disabled={status === "sending"} className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit">
              {status === "sending" ? "Sending..." : "Send message"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
