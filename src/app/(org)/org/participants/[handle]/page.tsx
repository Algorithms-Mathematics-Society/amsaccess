import { OrgShell } from "@/components/org/OrgShell";
import { ParticipantProfile } from "@/components/org/ParticipantProfile";

export const metadata = { title: "Participant · AMS Access" };

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  // No PageHeader: the profile leads with the participant's own identity card,
  // and OrgShell's NAV highlights Participants by prefix for this page anyway.
  return (
    <OrgShell>
      <ParticipantProfile handle={handle} />
    </OrgShell>
  );
}
