import { OrgShell } from "@/components/org/OrgShell";

// The shell lives here, not in each page, so it stays mounted across org
// navigation. Login and signup sit outside this group and get no shell.
export default function OrgConsoleLayout({ children }: { children: React.ReactNode }) {
  return <OrgShell>{children}</OrgShell>;
}
