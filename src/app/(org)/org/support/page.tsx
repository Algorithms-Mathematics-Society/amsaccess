import { OrgShell } from "@/components/org/OrgShell";
import { SupportInbox } from "@/components/org/SupportInbox";
export const metadata = { title: "Participant support · AMS Access" };
export default function SupportPage() {
  return (
    <OrgShell>
      <SupportInbox />
    </OrgShell>
  );
}
