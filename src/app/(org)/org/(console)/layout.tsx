import { OrgShell } from "@/components/org/OrgShell";
import { OrgSessionProvider } from "@/lib/client/useOrgRole";
import { callAmsApi } from "@/lib/server/amsApi";
import { getSession } from "@/lib/server/session";

// The shell lives here, not in each page, so it stays mounted across org
// navigation. Login and signup sit outside this group and get no shell.
export default async function OrgConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const me = session
    ? await callAmsApi<{ role?: string | null; uid?: string }>(
        "GET",
        "/auth/me",
        null,
        session.subject,
        2_000,
      )
    : null;
  const initialMe =
    me?.ok && typeof me.data?.uid === "string"
      ? {
          role: typeof me.data.role === "string" ? me.data.role : null,
          uid: me.data.uid,
          session_expires_at: session?.expiresAt ?? null,
        }
      : null;
  return (
    <OrgSessionProvider initialMe={initialMe}>
      <OrgShell>{children}</OrgShell>
    </OrgSessionProvider>
  );
}
