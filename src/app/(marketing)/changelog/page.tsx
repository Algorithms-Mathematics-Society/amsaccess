import { MarketingEndpointPage } from "@/components/MarketingEndpointPage";

export default function ChangelogPage() {
  return (
    <MarketingEndpointPage
      eyebrow="Changelog"
      title="Release notes for operational teams."
      body="Track desktop app releases, session policy changes, review timeline updates, and deployment-facing improvements."
      primaryHref="/download"
      primaryLabel="Get AMS Access"
      items={[
        { title: "Desktop releases", body: "Installers are organized by platform with version notes and release context." },
        { title: "Session policy", body: "Fullscreen session state remains visible while activity context is recorded for review." },
        { title: "Review timeline", body: "Written output and timeline context stay paired inside the review surface." }
      ]}
    />
  );
}
