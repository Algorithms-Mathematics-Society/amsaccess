import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { ContestsView } from "@/components/org/ContestsView";

export const metadata = { title: "Contests · AMS Access" };

export default function ContestsPage() {
  return (
    <OrgShell>
      <PageHeader title="Contests" subtitle="Schedule a round, add problems, share the code." />
      <ContestsView />
    </OrgShell>
  );
}
