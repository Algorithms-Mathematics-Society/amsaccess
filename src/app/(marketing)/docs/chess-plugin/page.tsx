import { redirect } from "next/navigation";

// Preserve the old public bookmark with a useful, nontechnical destination.
export default function PreviousGuidePage() {
  redirect("/docs/organize-assessment");
}
