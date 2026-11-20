import { ContestWorkflow } from "@/components/org/ContestWorkflow";

export const metadata = { title: "Contest workflow · AMS Access" };

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <ContestWorkflow key={uid} contestUid={uid} />;
}
