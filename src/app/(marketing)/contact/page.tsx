import { MarketingEndpointPage } from "@/components/MarketingEndpointPage";

export default function ContactPage() {
  return (
    <MarketingEndpointPage
      eyebrow="Contact"
      title="Talk to AMS Access."
      body="Contact the team for access, pricing, deployment planning, support paths, and institution evaluation needs."
      primaryHref="/pricing"
      primaryLabel="View Pricing"
      items={[
        { title: "Sales", body: "Discuss plan fit, event scale, and procurement requirements." },
        { title: "Support", body: "Coordinate deployment and operational questions for assessment teams." },
        { title: "Security", body: "Review product behavior and evidence handling with technical stakeholders." }
      ]}
    />
  );
}
