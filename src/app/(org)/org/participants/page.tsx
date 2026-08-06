import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { StudentsView } from "@/components/org/StudentsView";

export const metadata = { title: "Participants · AMS Access" };

export default function ParticipantsPage() {
  return (
    <OrgShell>
      <PageHeader
        title="Participants"
        subtitle="Every student, across every contest. This is the record a contest adds to."
      />
      <StudentsView />
    </OrgShell>
  );
}
