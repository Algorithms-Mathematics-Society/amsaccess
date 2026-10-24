"use client";

import { useCallback, useState } from "react";
import { useOrgNotifications } from "@/lib/client/useOrgNotifications";
import type { OrgNotification } from "@/lib/client/orgNotifications";
import { OrgNotificationDrawer } from "./OrgNotificationDrawer";
import { ParticipantModal, preloadParticipantProfile } from "./ParticipantModal";

/** Keep feed updates inside the drawer, rather than rendering the active
 * contest panel again whenever a poll or decision changes notification state. */
export function ContestNotifications({ contestUid, enabled, onNavigate }: {
  contestUid: string;
  enabled: boolean;
  onNavigate: (tab: "invigilation") => void;
}) {
  const notifications = useOrgNotifications(contestUid, enabled);
  const [participant, setParticipant] = useState<string | null>(null);
  const closeParticipant = useCallback(() => setParticipant(null), []);
  const review = useCallback((item: OrgNotification) => {
    const session = notifications.raw.sessions.find(row => row.uid === item.targetUid);
    const handle = session?.user_uid || session?.login_id || item.loginId;
    if (handle) {
      preloadParticipantProfile();
      setParticipant(handle);
    } else onNavigate("invigilation");
  }, [notifications.raw.sessions, onNavigate]);

  return <>
    {enabled && <OrgNotificationDrawer
      items={notifications.items}
      loading={notifications.loading}
      updatedAt={notifications.updatedAt}
      errors={notifications.errors}
      busyIds={notifications.busyIds}
      actionErrors={notifications.actionErrors}
      onAction={notifications.act}
      onRefresh={notifications.refresh}
      onReview={review}
      onReviewIntent={preloadParticipantProfile}
    />}
    <ParticipantModal handle={participant} onClose={closeParticipant} />
  </>;
}
