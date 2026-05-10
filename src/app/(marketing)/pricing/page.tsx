import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingEndpointPage";

const plans = [
  {
    name: "Pilot",
    for: "For teams validating controlled rounds with a small cohort.",
    capabilities: ["Controlled session policy", "Written response capture", "Basic review timeline"],
    cta: "Request access",
    href: "/contact"
  },
  {
    name: "Event",
    for: "For hiring windows, olympiads, scholarship rounds, and one-time evaluations.",
    capabilities: ["Higher candidate volume", "Reviewer workflows", "Release and export support"],
    cta: "Request access",
    href: "/contact"
  },
  {
    name: "Institution",
    for: "For universities and organizations running recurring high-trust evaluations.",
    capabilities: ["Multiple admins", "Centralized review", "Operational reporting"],
    cta: "Contact us",
    href: "/contact"
  },
  {
    name: "Enterprise",
    for: "For custom deployment, procurement, and integration requirements.",
    capabilities: ["Custom limits", "Deployment planning", "Support paths"],
    cta: "Contact us",
    href: "/contact"
  }
];

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <MarketingHeader />
      <section
        className="raycast-hero ams-hero-grid relative min-h-screen overflow-hidden px-5 pb-24 pt-36"
        style={{
          backgroundImage: "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      >
        <div className="raycast-hero-bg" />
        <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6] opacity-20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="ams-label mb-6">Pricing</p>
            <h1 className="bg-gradient-to-b from-white via-[#F4F4F5] to-[#A1A1AA] bg-clip-text text-5xl font-semibold leading-[0.96] tracking-tight text-transparent md:text-7xl">
              Plans for high-trust evaluation.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/60">
              Choose by operating model: pilot, event, institution, or custom deployment. Exact pricing is handled through access requests and procurement conversations.
            </p>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-4">
            {plans.map((plan, index) => (
              <article key={plan.name} className={`glass-card flex flex-col p-6 ${index === 2 ? "ams-card-featured" : ""}`}>
                <h2 className="text-2xl font-semibold tracking-tight text-white">{plan.name}</h2>
                <p className="mt-5 min-h-24 text-sm leading-6 text-white/55">{plan.for}</p>
                <div className="mt-8 border-t border-white/10 pt-5">
                  <p className="ams-label mb-4">Capability</p>
                  <ul className="grid gap-3 text-sm leading-6 text-white/55">
                    {plan.capabilities.map((capability) => (
                      <li key={capability}>{capability}</li>
                    ))}
                  </ul>
                </div>
                <Link className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#8B5CF6] hover:text-white" href={plan.href}>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
