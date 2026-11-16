import { ContestConsole } from "@/components/org/ContestConsole";

export const metadata = { title: "Contest · AMS Access" };

export default async function ContestConsolePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <ContestConsole contestUid={uid} />;
}
