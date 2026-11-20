import { SupportRequestError, supportRetryAfterMs } from "./support-poll.ts";
export type SupportMessage = {
  uid: string;
  sender: "participant" | "staff";
  body: string;
  created_at: string;
};
export type SupportSummary = {
  uid: string;
  contest_uid?: string | null;
  /** Present only on staff responses; never infer ownership from contact details. */
  user_uid?: string | null;
  email: string;
  phone: string;
  name: string;
  category: string;
  status: "open" | "resolved";
  updated_at: string;
  assignee?: SupportStaff | null;
  internal_note_count?: number;
  /** Older servers omit this field; absent means the existing chat behavior. */
  chat_enabled?: boolean;
};
export type SupportThread = SupportSummary & {
  messages: SupportMessage[];
  has_more: boolean;
};
export type SupportInbox = {
  items: SupportSummary[];
  has_more: boolean;
  next_cursor: string | null;
};

export async function supportApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(`/api/org/support${path}`, {
      method,
      signal: controller.signal,
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The server response was incomplete. Delivery is unconfirmed; retry safely.",
      );
    }
    if (controller.signal.aborted)
      throw new DOMException("Request aborted", "AbortError");
    if (!response.ok)
      throw new SupportRequestError(
        typeof data.detail === "string"
          ? data.detail
          : typeof data.error === "string"
            ? data.error
            : "Support request failed. Retry when connected.",
        response.status,
        supportRetryAfterMs(response.headers.get("Retry-After")),
      );
    return data as T;
  } catch (e) {
    if (
      e instanceof Error &&
      e.name !== "AbortError" &&
      !(e instanceof TypeError)
    )
      throw e;
    throw new Error(
      "Connection interrupted. Delivery is unconfirmed; retry sends the same reply safely.",
    );
  } finally {
    options.signal?.removeEventListener("abort", abort);
    clearTimeout(timer);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const isDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
export function isSupportSummary(value: unknown): value is SupportSummary {
  return (
    isRecord(value) &&
    isUuid(value.uid) &&
    (value.user_uid == null || isUuid(value.user_uid)) &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    (value.status === "open" || value.status === "resolved") &&
    (value.chat_enabled === undefined ||
      typeof value.chat_enabled === "boolean") &&
    (value.assignee === undefined ||
      value.assignee === null ||
      isSupportStaff(value.assignee)) &&
    (value.internal_note_count === undefined ||
      (typeof value.internal_note_count === "number" &&
        Number.isInteger(value.internal_note_count) &&
        value.internal_note_count >= 0)) &&
    isDate(value.updated_at)
  );
}
export function isSupportMessage(value: unknown): value is SupportMessage {
  return (
    isRecord(value) &&
    isUuid(value.uid) &&
    (value.sender === "participant" || value.sender === "staff") &&
    typeof value.body === "string" &&
    value.body.length <= 4000 &&
    isDate(value.created_at)
  );
}
export async function loadSupportInbox(
  status: "open" | "resolved",
  cursor?: string,
  signal?: AbortSignal,
  contestUid?: string,
  userUid?: string,
): Promise<SupportInbox> {
  if (userUid !== undefined && (!isUuid(userUid) || !isUuid(contestUid)))
    throw new Error(
      "Choose a verified participant and contest before loading tickets.",
    );
  const query = new URLSearchParams({ status, pagination: "cursor" });
  if (cursor) query.set("cursor", cursor);
  if (contestUid !== undefined) query.set("contest_uid", contestUid);
  if (userUid !== undefined) query.set("user_uid", userUid);
  const data = await supportApi<unknown>(`?${query}`, "GET", undefined, {
    signal,
  });
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    !data.items.every(isSupportSummary) ||
    (userUid !== undefined &&
      !data.items.every(
        (item) => item.user_uid === userUid && item.contest_uid === contestUid,
      )) ||
    typeof data.has_more !== "boolean" ||
    new Set(data.items.map((item) => item.uid)).size !== data.items.length ||
    (data.has_more &&
      (!data.items.length ||
        typeof data.next_cursor !== "string" ||
        !data.next_cursor ||
        data.next_cursor === cursor))
  )
    throw new Error(
      "The support inbox response was incomplete. Refresh to retry.",
    );
  return data as SupportInbox;
}
export async function loadSupportThread(
  uid: string,
  after?: string,
  signal?: AbortSignal,
): Promise<SupportThread> {
  const data = await supportApi<unknown>(
    `/${uid}${after ? `?after=${after}` : ""}`,
    "GET",
    undefined,
    { signal },
  );
  if (
    !isSupportSummary(data) ||
    data.uid !== uid ||
    !("messages" in data) ||
    !Array.isArray(data.messages) ||
    !data.messages.every(isSupportMessage) ||
    !("has_more" in data) ||
    typeof data.has_more !== "boolean" ||
    (data.has_more && data.messages.length === 0)
  )
    throw new Error(
      "The conversation response was incomplete. Refresh to retry.",
    );
  return data as SupportThread;
}

export type SupportStaff = { uid: string; display_name: string; email: string };
export type SupportNote = {
  uid: string;
  body: string;
  created_at: string;
  author?: SupportStaff | null;
};
const isSupportStaff = (value: unknown): value is SupportStaff =>
  isRecord(value) &&
  isUuid(value.uid) &&
  typeof value.display_name === "string" &&
  typeof value.email === "string";
export async function loadSupportAssignees(
  uid: string,
  signal?: AbortSignal,
): Promise<SupportStaff[]> {
  const data = await supportApi<unknown>(
    `/${uid}/assignees`,
    "GET",
    undefined,
    { signal },
  );
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    !data.items.every(isSupportStaff)
  )
    throw new Error(
      "Eligible staff response was incomplete. Refresh to retry.",
    );
  return data.items;
}
export async function assignSupport(
  uid: string,
  assignee: string | null,
): Promise<SupportSummary> {
  const data = await supportApi<unknown>(`/${uid}/assignment`, "PATCH", {
    assignee_uid: assignee,
  });
  if (
    !isSupportSummary(data) ||
    data.uid !== uid ||
    !isRecord(data) ||
    (assignee === null
      ? data.assignee !== null
      : !isSupportStaff(data.assignee) || data.assignee.uid !== assignee)
  )
    throw new Error(
      "Assignment was not confirmed. Retry the same assignment safely.",
    );
  return data;
}
export async function loadSupportNotes(
  uid: string,
  after?: string,
  signal?: AbortSignal,
): Promise<{
  notes: SupportNote[];
  has_more: boolean;
  next_cursor: string | null;
}> {
  const data = await supportApi<unknown>(
    `/${uid}/notes${after ? `?after=${encodeURIComponent(after)}` : ""}`,
    "GET",
    undefined,
    { signal },
  );
  if (
    !isRecord(data) ||
    !Array.isArray(data.notes) ||
    !data.notes.every(
      (note) =>
        isRecord(note) &&
        isUuid(note.uid) &&
        typeof note.body === "string" &&
        note.body.length <= 4000 &&
        isDate(note.created_at) &&
        (note.author === undefined ||
          note.author === null ||
          isSupportStaff(note.author)),
    ) ||
    typeof data.has_more !== "boolean" ||
    (data.has_more &&
      (!data.notes.length ||
        typeof data.next_cursor !== "string" ||
        !data.next_cursor ||
        data.next_cursor === after))
  )
    throw new Error(
      "Internal notes response was incomplete. Refresh to retry.",
    );
  return data as {
    notes: SupportNote[];
    has_more: boolean;
    next_cursor: string | null;
  };
}
