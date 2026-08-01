import { notFound, redirect } from "next/navigation";
import ContestRoom from "@/components/contest/ContestRoom";
import { callAmsApi } from "@/lib/server/amsApi";
import { requireSubject } from "@/lib/server/session";
import type { Contest } from "@/lib/contestTypes";

export const dynamic = "force-dynamic";

export default async function ContestPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const subject = await requireSubject();
  if (!subject) redirect("/contest/join");

  const { uid } = await params;
  const res = await callAmsApi<Contest>("GET", `/contests/${uid}`, null, subject);
  if (res.status === 404) notFound();
  if (!res.ok) {
    // A contest you haven't joined is indistinguishable from one that doesn't
    // exist, from here — sending people to the code form is the useful move.
    redirect("/contest/join");
  }

  return <ContestRoom initial={res.data} />;
}
