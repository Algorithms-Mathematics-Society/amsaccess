import { MarketingEndpointPage } from "@/components/MarketingEndpointPage";

export default function DocsPage() {
  return (
    <MarketingEndpointPage
      eyebrow="Docs"
      title="Docs for controlled rounds."
      body="A concise operating reference for deployment, session policy, review timelines, and activity context."
      primaryHref="/download"
      primaryLabel="Get AMS Access"
      items={[
        { title: "Deployment", body: "Guidance for installing and rolling out the downloadable desktop app." },
        { title: "Session policy", body: "Reference material for fullscreen requirements, autosave, response types, and timeline settings." },
        { title: "Review timeline", body: "How written work and activity context are presented for high-trust review." }
      ]}
    />
  );
}
