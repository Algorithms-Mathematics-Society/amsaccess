export const plans = [
  {
    name: "Pilot",
    for: "For teams validating controlled rounds with a small cohort.",
    capabilities: ["Fullscreen controlled sessions", "Written response workflows", "Reviewer timeline controls"],
    cta: "Request access",
    href: "/contact"
  },
  {
    name: "Event",
    for: "For hiring windows, olympiads, scholarship rounds, and one-time evaluations.",
    capabilities: ["Operational visibility", "Session timelines", "Reviewer evidence collection"],
    cta: "Request access",
    href: "/contact"
  },
  {
    name: "Institution",
    for: "For universities and organizations running recurring high-trust evaluations.",
    capabilities: ["Operational visibility", "Session timelines", "Autoscaling judge fleet"],
    cta: "Contact us",
    href: "/contact"
  },
  {
    name: "Enterprise",
    for: "For custom deployment, procurement, and integration requirements.",
    capabilities: ["Autoscaling judge fleet", "Operational visibility", "Deployment planning"],
    cta: "Contact us",
    href: "/contact"
  }
] as const;

export const planStyles = [
  "border-slate-200",
  "border-purple-200",
  "border-purple-300",
  "border-slate-300"
] as const;

export const comparisonGroups = [
  {
    category: "Session Architecture",
    rows: [
      ["Max session duration", "2 hours", "4 hours", "8 hours", "Policy-defined"],
      ["Autosave frequency", "30 seconds", "15 seconds", "10 seconds", "Custom interval"],
      ["Offline resilience buffer", "Local recovery window", "Extended local queue", "Managed offline queue", "Continuity planning"],
      ["Desktop shell deployment", "Windows, macOS, Linux", "Signed event packages", "Managed release channels", "Custom build pipeline"]
    ]
  },
  {
    category: "Judge Infrastructure",
    rows: [
      ["Execution model", "Shared judge pool", "Reserved event capacity", "Dedicated judge lanes", "Dedicated Firecracker VM fleet"],
      ["Queue priority", "Standard", "Event priority", "Institution priority", "Contracted SLO"],
      ["Custom Docker image support", "Curated base images", "Approved images", "Managed image registry", "Custom image governance"],
      ["Autoscaling judge fleet", "On request", "Event windows", "Included", "Dedicated capacity"]
    ]
  },
  {
    category: "Reviewer Context",
    rows: [
      ["Written response workflows", "Included", "Structured evidence capture", "Multi-reviewer workflows", "Custom review model"],
      ["Session timelines", "Basic timeline", "Reviewer timeline controls", "High-resolution timelines", "Exportable audit trail"],
      ["Keystroke retention limits", "14 days", "30 days", "90 days", "Policy-defined retention"],
      ["Timeline event resolution", "Milestone events", "5-second event grouping", "1-second event resolution", "Custom event schema"]
    ]
  },
  {
    category: "Deployment & Auth",
    rows: [
      ["SAML / SSO", "Not included", "Optional", "Included", "Custom IdP mapping"],
      ["Custom MDM deployment packages", "Not included", "Optional", "Included", "Procurement-ready packaging"],
      ["Operational visibility", "Round summary", "Live event dashboard", "Institution workspace", "Cross-program command view"],
      ["Support model", "Async launch support", "Event launch support", "Deployment specialist", "Named operational team"]
    ]
  }
] as const;
