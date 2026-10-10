import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { ProblemsTabs } from "@/components/org/ProblemsTabs";

export const metadata = { title: "Problems · AMS Access" };

export default function ProblemsPage() {
  return (
    <OrgShell>
      <PageHeader
        title="Problems"
        subtitle="Upload a built cxxprobe package, or write one here and verify it on the judge."
      />
      <ProblemsTabs />
    </OrgShell>
  );
}
