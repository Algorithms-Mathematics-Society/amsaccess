import { OrgShell, PageHeader } from "@/components/org/OrgShell";
import { MailConsole } from "@/components/org/MailConsole";

export const metadata = { title: "Mails · AMS Access" };

export default function MailsPage() {
  return (
    <OrgShell>
      <PageHeader
        title="Mails"
        subtitle="Approval notices, credential emails, and anything else a roster needs to hear. Per person, not per batch."
      />
      <MailConsole />
    </OrgShell>
  );
}
