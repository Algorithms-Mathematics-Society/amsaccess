import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { ProblemsView } from "@/components/org/ProblemsView";

export const metadata = { title: "Problems · AMS Access" };

export default function ProblemsPage() {
  return (
    <OrgShell>
      <PageHeader
        title="Problems"
        subtitle="cxxprobe packages. Each upload creates a new immutable version."
      />
      <ProblemsView />
    </OrgShell>
  );
}
