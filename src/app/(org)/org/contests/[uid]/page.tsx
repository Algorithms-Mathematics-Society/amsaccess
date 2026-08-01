import { OrgShell } from "@/components/org/OrgShell";
import { ContestConsole } from "@/components/org/ContestConsole";

export const metadata = { title: "Contest · AMS Access" };

export default async function ContestConsolePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return (
    <OrgShell>
      <ContestConsole contestUid={uid} />
    </OrgShell>
  );
}
