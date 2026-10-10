import type { Metadata } from "next";
import { FirmsPortalMount } from "@/components/FirmsPortalMount";

export const metadata: Metadata = {
  title: "Firms",
  description: "AMS Access hiring workspace for partner firms.",
};

export default function FirmsPage() {
  return <FirmsPortalMount />;
}
