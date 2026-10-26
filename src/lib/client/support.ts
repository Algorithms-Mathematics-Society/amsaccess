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
  email: string;
  phone: string;
  name: string;
  category: string;
  status: "open" | "resolved";
  updated_at: string;
  /** Older servers omit this field; absent means the existing chat behavior. */
  chat_enabled?: boolean;
};
export type SupportThread = SupportSummary & {
  messages: SupportMessage[];
  has_more: boolean;
};
export type SupportInbox = { items: SupportSummary[]; has_more: boolean };

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
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    (value.status === "open" || value.status === "resolved") &&
    (value.chat_enabled === undefined ||
      typeof value.chat_enabled === "boolean") &&
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
  offset = 0,
  signal?: AbortSignal,
): Promise<SupportInbox> {
  const data = await supportApi<unknown>(
    `?status=${status}&offset=${offset}`,
    "GET",
    undefined,
    { signal },
  );
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    !data.items.every(isSupportSummary) ||
    typeof data.has_more !== "boolean"
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
