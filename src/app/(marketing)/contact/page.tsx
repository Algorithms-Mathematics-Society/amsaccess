"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Check } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";
import { MarketingFooter } from "@/components/MarketingFooter";

const categories = [
  {
    title: "Sales",
    value: "Sales",
    body: "Discuss plan fit, event scale, and procurement requirements."
  },
  {
    title: "Support",
    value: "Support",
    body: "Coordinate deployment and operational questions for assessment teams."
  },
  {
    title: "Security",
    value: "Security",
    body: "Review product behavior and evidence handling with technical stakeholders."
  }
] as const;

const roundVolumes = ["Not sure yet", "< 100", "100-1,000", "1,000+"] as const;

type Category = (typeof categories)[number]["value"];
type RoundVolume = (typeof roundVolumes)[number];

type ContactSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
};

function ContactSelect<T extends string>({ label, value, options, onChange }: ContactSelectProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-2 text-xs font-medium text-slate-600">
      {label}
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          className="flex min-h-12 w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition hover:border-slate-300 focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-100 focus-visible:outline-none"
        >
          <span>{value}</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            role="listbox"
            aria-label={label}
          >
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  className="flex min-h-9 w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span>{option}</span>
                  {option === value ? <Check className="h-3.5 w-3.5 text-purple-600" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100";

export default function ContactPage() {
  const [category, setCategory] = useState<Category>("Sales");
  const [expectedRoundVolume, setExpectedRoundVolume] = useState<RoundVolume>("Not sure yet");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const previewPayload = {
    request: category.toLowerCase(),
    volume: expectedRoundVolume,
    contact: {
      name: name || null,
      organization: organization || null,
      email: email || null
    },
    message: message || null
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const form = event.currentTarget;
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        organization,
        email,
        expectedRoundVolume,
        message,
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
    setExpectedRoundVolume("Not sure yet");
    setName("");
    setOrganization("");
    setEmail("");
    setMessage("");
    setStatus("sent");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-purple-200 selection:text-purple-900">
      <MarketingHeader />
      <section className="relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-5 sm:pt-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-slate-50/30 pointer-events-none" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.78fr_1.22fr]">
          <div>
            <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Contact
            </div>
            <h1 className="max-w-3xl text-4xl font-medium leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-7xl">
              Discuss deployment.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg md:text-xl">
              Contact the team for access, pricing, deployment planning, support paths, and institution evaluation needs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800"
                href="/pricing"
              >
                View Pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                href="/"
              >
                Back to Home
              </Link>
            </div>

            <div className="mt-10 grid gap-4">
              {categories.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  aria-pressed={category === item.value}
                  onClick={() => setCategory(item.value)}
                  className={`group rounded-xl border p-5 text-left transition ${
                    category === item.value
                      ? "border-purple-300 bg-purple-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/50 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold tracking-tight text-slate-900">{item.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-500">{item.body}</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition ${category === item.value ? "text-purple-600" : "text-slate-300 group-hover:text-purple-400"}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_0.86fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm grid content-start gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-medium text-slate-600">
                  Name
                  <input required name="name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
                </label>
                <label className="grid gap-2 text-xs font-medium text-slate-600">
                  Organization
                  <input name="organization" value={organization} onChange={(event) => setOrganization(event.target.value)} className={fieldClass} />
                </label>
              </div>
              <label className="grid gap-2 text-xs font-medium text-slate-600">
                Email
                <input required type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
              </label>
              <ContactSelect label="Category" value={category} options={categories.map((item) => item.value)} onChange={setCategory} />
              <ContactSelect label="Expected Round Volume" value={expectedRoundVolume} options={roundVolumes} onChange={setExpectedRoundVolume} />
              <label className="grid gap-2 text-xs font-medium text-slate-600">
                Message
                <textarea required name="message" rows={7} value={message} onChange={(event) => setMessage(event.target.value)} className={`${fieldClass} resize-y leading-6`} />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {status === "sent" ? <p className="text-sm text-emerald-700">Message received. The team will follow up by email.</p> : null}
              <button
                disabled={status === "sending"}
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition-all hover:scale-105 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
              >
                {status === "sending" ? "Sending..." : "Send message"}
              </button>
              <p className="text-xs leading-5 text-slate-400">
                Deployment and security specialists typically respond within 24-48 hours.
              </p>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                <p className="font-medium text-slate-700">Prefer email?</p>
                <div className="mt-2 grid gap-1">
                  <a className="transition hover:text-purple-700" href="mailto:sales@amsaccess.com">Sales: sales@amsaccess.com</a>
                  <a className="transition hover:text-purple-700" href="mailto:support@amsaccess.com">Support: support@amsaccess.com</a>
                  <a className="transition hover:text-purple-700" href="mailto:security@amsaccess.com">Security: security@amsaccess.com</a>
                </div>
              </div>
            </form>

            <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm grid content-start gap-4 xl:sticky xl:top-28">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Request payload</p>
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                  JSON
                </span>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-50 p-4 font-mono text-[11px] leading-5 text-slate-600">
                {JSON.stringify(previewPayload, null, 2)}
              </pre>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 font-mono text-[11px] leading-5">
                <p className="text-slate-400">$ curl access.ams/contact</p>
                <p className={
                  status === "sent"
                    ? "mt-2 text-emerald-700"
                    : status === "sending"
                      ? "mt-2 text-purple-600"
                      : error
                        ? "mt-2 text-red-600"
                        : "mt-2 text-slate-500"
                }>
                  {status === "sent"
                    ? "POST /api/contact [200 OK]"
                    : status === "sending"
                      ? "POST /api/contact [pending]"
                      : error
                        ? "POST /api/contact [retry]"
                        : "POST /api/contact [ready]"}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
