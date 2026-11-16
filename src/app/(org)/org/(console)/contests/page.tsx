import { PageHeader } from "@/components/org/OrgShell";
import { ContestsView } from "@/components/org/ContestsView";

export const metadata = { title: "Contests · AMS Access" };

export default function ContestsPage() {
  return (
    <>
      <PageHeader title="Contests" subtitle="Schedule a round, add problems, share the code." />
      <ContestsView />
    </>
  );
}
