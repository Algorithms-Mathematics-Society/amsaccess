import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { DashboardView } from "@/components/org/DashboardView";

export const metadata = { title: "Dashboard · AMS Access" };

export default function DashboardPage() {
  return (
    <OrgShell>
      <PageHeader title="Dashboard" subtitle="Contests, problems, and what is judging right now." />
      <DashboardView />
    </OrgShell>
  );
}
