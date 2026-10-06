import { ParticipantProfile } from "@/components/org/ParticipantProfile";

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <ParticipantProfile handle={handle} />;
}
