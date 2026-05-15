"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";

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
    <div className="grid gap-2 text-xs font-medium text-white/60">
      {label}
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          className="ams-contact-select"
        >
          <span>{value}</span>
          <span className="ams-contact-select-chevron" aria-hidden="true" />
        </button>
        {open ? (
          <div className="ams-contact-select-menu" role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className="ams-contact-select-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span>{option}</span>
                {option === value ? <span className="h-1.5 w-1.5 rounded-full bg-purple-200" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.78fr_1.22fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-200 backdrop-blur-md">
              Contact
            </div>
            <h1 className="max-w-3xl bg-gradient-to-b from-white to-[#D4D4D8] bg-clip-text text-4xl font-semibold leading-[1.05] tracking-tight text-transparent sm:text-5xl md:text-7xl">
              Discuss deployment.
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
                <button
                  key={item.title}
                  type="button"
                  aria-pressed={category === item.value}
                  onClick={() => setCategory(item.value)}
                  className={`group rounded border p-5 text-left transition ${
                    category === item.value
                      ? "border-purple-300/30 bg-white/[0.055] shadow-[0_0_24px_rgba(139,92,246,0.055)]"
                      : "border-white/10 bg-[#09090B]/80 hover:border-purple-300/25 hover:bg-white/[0.035]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold tracking-tight text-white">{item.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-white/65 md:text-white/50">{item.body}</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 transition ${category === item.value ? "text-purple-100" : "text-purple-200/70 group-hover:text-purple-100"}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_0.86fr]">
            <form onSubmit={handleSubmit} className="ams-contact-form grid content-start gap-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-medium text-white/60">
                  Name
                  <input required name="name" value={name} onChange={(event) => setName(event.target.value)} className="ams-contact-field" />
                </label>
                <label className="grid gap-2 text-xs font-medium text-white/60">
                  Organization
                  <input name="organization" value={organization} onChange={(event) => setOrganization(event.target.value)} className="ams-contact-field" />
                </label>
              </div>
              <label className="grid gap-2 text-xs font-medium text-white/60">
                Email
                <input required type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} className="ams-contact-field" />
              </label>
              <ContactSelect label="Category" value={category} options={categories.map((item) => item.value)} onChange={setCategory} />
              <ContactSelect label="Expected Round Volume" value={expectedRoundVolume} options={roundVolumes} onChange={setExpectedRoundVolume} />
              <label className="grid gap-2 text-xs font-medium text-white/60">
                Message
                <textarea required name="message" rows={7} value={message} onChange={(event) => setMessage(event.target.value)} className="ams-contact-field resize-y leading-6" />
              </label>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              {status === "sent" ? <p className="text-sm text-emerald-300">Message received. The team will follow up by email.</p> : null}
              <button disabled={status === "sending"} className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit">
                {status === "sending" ? "Sending..." : "Send message"}
              </button>
              <p className="text-xs leading-5 text-white/40">
                Deployment and security specialists typically respond within 24-48 hours.
              </p>
              <div className="rounded-[8px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/50">
                <p className="font-medium text-white/70">Prefer email?</p>
                <div className="mt-2 grid gap-1">
                  <a className="transition hover:text-white" href="mailto:sales@amsaccess.com">Sales: sales@amsaccess.com</a>
                  <a className="transition hover:text-white" href="mailto:support@amsaccess.com">Support: support@amsaccess.com</a>
                  <a className="transition hover:text-white" href="mailto:security@amsaccess.com">Security: security@amsaccess.com</a>
                </div>
              </div>
            </form>

            <aside className="ams-contact-form grid content-start gap-4 p-5 xl:sticky xl:top-28">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <p className="ams-label">Request payload</p>
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  JSON
                </span>
              </div>
              <pre className="ams-embedded-screen overflow-x-auto rounded p-4 font-mono text-[11px] leading-5 text-white/55">
                {JSON.stringify(previewPayload, null, 2)}
              </pre>
              <div className="ams-embedded-screen rounded p-4 font-mono text-[11px] leading-5">
                <p className="text-white/28">$ curl access.ams/contact</p>
                <p className={status === "sent" ? "mt-2 text-emerald-300/80" : status === "sending" ? "mt-2 text-purple-200/75" : error ? "mt-2 text-red-300/75" : "mt-2 text-white/42"}>
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
    </main>
  );
}
