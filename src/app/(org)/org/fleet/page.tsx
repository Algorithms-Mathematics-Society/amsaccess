import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { FleetPanel } from "@/components/org/FleetPanel";

export const metadata = { title: "Judging · AMS Access" };

export default function FleetPage() {
  return (
    <OrgShell>
      <PageHeader
        title="Judging"
        subtitle="One fleet, shared by every contest. It warms itself before a contest opens and stands down afterwards — this is where you watch it, prove it, and test it."
      />
      <FleetPanel inset />
    </OrgShell>
  );
}
