import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { StudentsView } from "@/components/org/StudentsView";

export const metadata = { title: "Students · AMS Access" };

export default function ParticipantsPage() {
  return (
    <OrgShell>
      <PageHeader
        title="Students"
        subtitle="Everyone on the platform. A login belongs to the student, not to a round, and a contest adds to this record rather than the other way about."
      />
      <StudentsView />
    </OrgShell>
  );
}
