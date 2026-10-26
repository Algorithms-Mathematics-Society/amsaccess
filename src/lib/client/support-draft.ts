/** One outbox per conversation: retry identifiers survive navigation and reload. */
export type SupportReply = { uid: string; body: string };
export type SupportDraft = { draft: string; pending: SupportReply | null };
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const key = (uid: string) => `ams_org_support_draft_v1:${uid}`;

export function readSupportDraft(
  storage: DraftStorage,
  uid: string,
): SupportDraft {
  const saved = storage.getItem(key(uid));
  if (!saved) return { draft: "", pending: null };
  const data: unknown = JSON.parse(saved);
  if (
    !data ||
    typeof data !== "object" ||
    !("draft" in data) ||
    typeof data.draft !== "string" ||
    data.draft.length > 4000
  ) {
    throw new Error(
      "The saved draft could not be read. Keep this page open while replying.",
    );
  }
  const pending = "pending" in data ? data.pending : null;
  if (
    pending !== null &&
    (typeof pending !== "object" ||
      !("uid" in pending) ||
      typeof pending.uid !== "string" ||
      !UUID.test(pending.uid) ||
      !("body" in pending) ||
      typeof pending.body !== "string" ||
      !pending.body.trim() ||
      pending.body.length > 4000)
  ) {
    throw new Error(
      "The saved reply could not be read. Check the conversation before sending again.",
    );
  }
  return { draft: data.draft, pending: pending as SupportReply | null };
}

export function saveSupportDraft(
  storage: DraftStorage,
  uid: string,
  draft: SupportDraft,
): void {
  if (!draft.draft && !draft.pending) storage.removeItem(key(uid));
  else storage.setItem(key(uid), JSON.stringify(draft));
}

/** An acknowledgement from an unmounted conversation must not erase a newer draft. */
export function acknowledgeSupportReply(
  storage: DraftStorage,
  uid: string,
  replyUid: string,
): void {
  const current = readSupportDraft(storage, uid);
  if (current.pending?.uid === replyUid)
    saveSupportDraft(storage, uid, { draft: "", pending: null });
}
