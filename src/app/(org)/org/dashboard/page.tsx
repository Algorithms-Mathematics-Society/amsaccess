import { OrgShell } from "@/components/org/OrgShell";
import { DashboardView } from "@/components/org/DashboardView";

export const metadata = { title: "Dashboard · AMS Access" };

// The page header lives inside DashboardView, on Astryx with the other sections.
export default function DashboardPage() {
  return (
    <OrgShell>
      <DashboardView />
    </OrgShell>
  );
}
