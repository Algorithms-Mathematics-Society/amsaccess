import { MarketingEndpointPage } from "@/components/MarketingEndpointPage";

export default function ProductPage() {
  return (
    <MarketingEndpointPage
      eyebrow="Product"
      title="A controlled environment for serious rounds."
      body="Access by AMS packages controlled sessions, activity context, written response capture, and reviewer timelines into a downloadable desktop app."
      items={[
        { title: "Controlled round", body: "Run high-trust evaluations inside a dedicated desktop environment with fullscreen session policy." },
        { title: "Activity context", body: "Capture review context around focus, visibility, paste events, and submission state." },
        { title: "Review timeline", body: "Pair candidate output with readable session history for human-led review." }
      ]}
    />
  );
}
