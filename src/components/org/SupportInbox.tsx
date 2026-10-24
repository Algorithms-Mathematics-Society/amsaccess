"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { Button } from "@astryxdesign/core/Button";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Banner } from "@astryxdesign/core/Banner";
import { startOrgPolling } from "@/lib/client/orgPolling";
import { useOrgRole } from "@/lib/client/useOrgRole";
import {
  supportApi,
  loadSupportInbox,
  loadSupportThread,
  type SupportInbox as InboxData,
  type SupportThread,
} from "@/lib/client/support";
import {
  readSupportDraft,
  saveSupportDraft,
  acknowledgeSupportReply,
} from "@/lib/client/support-draft";
import { OrgAstryxTheme } from "./OrgAstryxTheme";

const messageError = (e: unknown) =>
  e instanceof Error ? e.message : "Unable to load support.";

/** Visible on the main dashboard, independently of any contest. */
export function SupportAttention() {
  const router = useRouter();
  const { role, known } = useOrgRole();
  const [data, setData] = useState<InboxData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!known || role === "intern" || !role) return;
    let stopped = false;
    const stop = startOrgPolling(async () => {
      try {
        const d = await loadSupportInbox("open");
        if (!stopped) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (!stopped) setError(messageError(e));
      }
    }, 15000);
    return () => {
      stopped = true;
      stop();
    };
  }, [role, known]);
  if (!known || !role || role === "intern") return null;
  return (
    <HStack
      justify="between"
      align="center"
      gap={4}
      wrap="wrap"
      style={{
        paddingBlock: "var(--spacing-4)",
        borderBlockEnd: "var(--border-width) solid var(--color-border)",
      }}
    >
      <VStack gap={1}>
        <Heading level={4} accessibilityLevel={2}>
          Participant support
        </Heading>
        <Text role="status">
          {error
            ? "Support inbox unavailable. Open the inbox to retry."
            : data
              ? `${data.items.length}${data.has_more ? "+" : ""} open issues need resolution`
              : "Checking open issues…"}
        </Text>
      </VStack>
      <Button
        label="Open support inbox"
        variant="secondary"
        onClick={() => router.push("/org/support")}
      />
    </HStack>
  );
}

export function SupportInbox() {
  return (
    <OrgAstryxTheme>
      <Inbox />
    </OrgAstryxTheme>
  );
}

function Inbox() {
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<InboxData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let stopped = false;
    setData(null);
    setError("");
    const stop = startOrgPolling(async () => {
      try {
        const d = await loadSupportInbox(filter, offset);
        if (!stopped) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (!stopped) setError(messageError(e));
      }
    }, 10000);
    return () => {
      stopped = true;
      stop();
    };
  }, [filter, offset, refresh]);
  return (
    <VStack gap={6} style={{ padding: "var(--spacing-6)", minWidth: 0 }}>
      <HStack justify="between" gap={4} align="center" wrap="wrap">
        <VStack gap={1}>
          <Heading level={1}>Participant support</Heading>
          <Text color="secondary">
            Login, device and assessment issues across all contests.
          </Text>
        </VStack>
        <Button
          label="Refresh inbox"
          variant="secondary"
          onClick={() => setRefresh((n) => n + 1)}
        />
      </HStack>
      <HStack gap={2}>
        <Button
          label="Open issues"
          aria-pressed={filter === "open"}
          variant={filter === "open" ? "primary" : "secondary"}
          onClick={() => {
            setFilter("open");
            setOffset(0);
          }}
        />
        <Button
          label="Resolved"
          aria-pressed={filter === "resolved"}
          variant={filter === "resolved" ? "primary" : "secondary"}
          onClick={() => {
            setFilter("resolved");
            setOffset(0);
          }}
        />
      </HStack>
      {error && (
        <Banner
          status="error"
          role="alert"
          title="Inbox refresh failed"
          description={error}
        />
      )}
      <HStack gap={6} align="start" wrap="wrap" style={{ minWidth: 0 }}>
        <VStack
          gap={0}
          style={{ flex: "1 1 calc(var(--spacing-10) * 8)", minWidth: 0 }}
        >
          {!data && !error && <Text role="status">Loading issues…</Text>}
          {data?.items.length === 0 && <Text>No {filter} issues.</Text>}
          {data?.items.map((item) => (
            <VStack
              key={item.uid}
              gap={2}
              style={{
                paddingBlock: "var(--spacing-4)",
                borderBlockEnd: "var(--border-width) solid var(--color-border)",
                overflowWrap: "anywhere",
              }}
            >
              <HStack gap={2} justify="between" align="start" wrap="wrap">
                <Text>{item.name}</Text>
                <Text type="supporting">
                  {item.category.toLowerCase().replaceAll("_", " ")}
                </Text>
              </HStack>
              <Text type="supporting">
                {item.email} · {item.phone}
              </Text>
              <Text type="supporting">
                Updated {new Date(item.updated_at).toLocaleString()}
              </Text>
              <Button
                label={
                  selected === item.uid
                    ? "Viewing conversation"
                    : `Open conversation with ${item.name}`
                }
                variant={selected === item.uid ? "primary" : "secondary"}
                onClick={() => setSelected(item.uid)}
              />
            </VStack>
          ))}
          <HStack gap={3} style={{ paddingBlock: "var(--spacing-4)" }}>
            <Button
              label="Previous issues"
              variant="ghost"
              isDisabled={offset === 0}
              onClick={() => setOffset((n) => Math.max(0, n - 50))}
            />
            <Button
              label="Next issues"
              variant="ghost"
              isDisabled={!data?.has_more}
              onClick={() => setOffset((n) => n + 50)}
            />
          </HStack>
        </VStack>
        <VStack
          gap={4}
          style={{ flex: "2 1 calc(var(--spacing-10) * 12)", minWidth: 0 }}
        >
          {selected ? (
            <Conversation
              key={selected}
              uid={selected}
              onChange={() => setRefresh((n) => n + 1)}
            />
          ) : (
            <Text color="secondary">
              Select an issue to read the conversation and reply.
            </Text>
          )}
        </VStack>
      </HStack>
    </VStack>
  );
}

function Conversation({
  uid,
  onChange,
}: {
  uid: string;
  onChange: () => void;
}) {
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ uid: string; body: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const messages = useRef<SupportThread["messages"]>([]);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const stream = useRef<HTMLElement | null>(null);
  useEffect(() => {
    mounted.current = true;
    try {
      const saved = readSupportDraft(sessionStorage, uid);
      setDraft(saved.draft);
      setPending(saved.pending);
    } catch {
      setStorageWarning(
        "Draft recovery is unavailable. Keep this conversation open until your reply is confirmed. Check the conversation before sending again after a reload.",
      );
    }
    setReady(true);
    return () => {
      mounted.current = false;
    };
  }, [uid]);
  function persist(
    draft: string,
    pending: { uid: string; body: string } | null,
  ) {
    try {
      saveSupportDraft(sessionStorage, uid, { draft, pending });
    } catch {
      setStorageWarning(
        "Draft recovery is unavailable. Keep this conversation open until your reply is confirmed.",
      );
    }
  }
  function editDraft(value: string) {
    setDraft(value);
    persist(value, pending);
  }
  useEffect(() => {
    let stopped = false;
    const stop = startOrgPolling(async () => {
      try {
        let more = true;
        while (more && !stopped) {
          const last = messages.current.at(-1)?.uid;
          const d = await loadSupportThread(uid, last);
          if (stopped) return;
          const seen = new Set(messages.current.map((m) => m.uid));
          const nextMessages = [
            ...messages.current,
            ...d.messages.filter((m) => !seen.has(m.uid)),
          ];
          if (d.has_more && nextMessages.at(-1)?.uid === last) {
            throw new Error("Chat history did not advance. Refresh to retry.");
          }
          messages.current = nextMessages;
          setThread({ ...d, messages: messages.current });
          setReadError("");
          more = d.has_more;
        }
      } catch (e) {
        if (!stopped) setReadError(messageError(e));
      }
    }, 4000);
    return () => {
      stopped = true;
      stop();
    };
  }, [uid, refresh]);
  useEffect(() => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
  }, [thread?.messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!ready || inFlight.current) return;
    const message = pending ?? { uid: crypto.randomUUID(), body: draft.trim() };
    if (!message.body) return;
    inFlight.current = true;
    setBusy(true);
    setPending(message);
    persist(draft, message);
    setError("");
    try {
      const ack = await supportApi<{ uid: string }>(
        `/${uid}/messages`,
        "POST",
        message,
      );
      if (ack.uid !== message.uid)
        throw new Error("Reply was not confirmed. Retry safely.");
      try {
        acknowledgeSupportReply(sessionStorage, uid, message.uid);
      } catch {
        if (mounted.current)
          setStorageWarning(
            "Your reply was sent, but the saved draft could not be cleared. Check the conversation before replying after a reload.",
          );
      }
      if (!mounted.current) return;
      setPending(null);
      setDraft("");
      setRefresh((n) => n + 1);
      onChange();
    } catch (e) {
      if (mounted.current) setError(messageError(e));
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function changeStatus() {
    if (!thread || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await supportApi(`/${uid}`, "PATCH", {
        status: thread.status === "open" ? "resolved" : "open",
      });
      if (!mounted.current) return;
      setRefresh((n) => n + 1);
      onChange();
    } catch (e) {
      if (mounted.current) setError(messageError(e));
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <VStack gap={4} style={{ minWidth: 0, overflowWrap: "anywhere" }}>
      {storageWarning && (
        <Banner
          status="warning"
          title="Draft recovery unavailable"
          description={storageWarning}
        />
      )}
      {readError && (
        <Banner
          status="warning"
          role="status"
          title="Conversation refresh failed"
          description={readError}
        />
      )}
      {!thread ? (
        <Text role="status">
          {readError
            ? "Reconnect to read this issue."
            : "Loading conversation…"}
        </Text>
      ) : (
        <>
          <Heading level={3} accessibilityLevel={2}>
            {thread.name}
          </Heading>
          <Text>
            {thread.email} · {thread.phone}
          </Text>
          <Text type="supporting">
            Contact details are self-reported and unverified. Never use this
            chat alone to authorize a credential reset.
          </Text>
          <Text type="supporting">
            Reference: {thread.uid} · {thread.status}
          </Text>
          <VStack
            ref={stream}
            role="log"
            aria-label="Participant support messages"
            aria-live="polite"
            aria-relevant="additions"
            gap={4}
            style={{
              maxHeight: "calc(var(--spacing-10) * 10)",
              overflowY: "auto",
              overflowWrap: "anywhere",
            }}
          >
            {thread.messages.map((message) => (
              <VStack
                key={message.uid}
                gap={1}
                style={{
                  background: "var(--color-background-card)",
                  padding: "var(--spacing-3)",
                  borderRadius: "var(--radius-element)",
                }}
              >
                <Text type="supporting">
                  {message.sender === "staff" ? "Staff" : thread.name} ·{" "}
                  {new Date(message.created_at).toLocaleString()}
                </Text>
                <Text
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {message.body}
                </Text>
              </VStack>
            ))}
          </VStack>
          {error && (
            <Banner
              status="error"
              role="alert"
              title="Action not confirmed"
              description={error}
            />
          )}
          {thread.status === "resolved" && pending && (
            <Banner
              status="warning"
              title="Reply awaiting confirmation"
              description="This issue was resolved while a reply was pending. Reopen it, then retry the saved reply to confirm delivery safely."
            />
          )}
          {thread.status === "open" && (
            <form onSubmit={(e) => void send(e)}>
              <VStack gap={3}>
                <TextArea
                  label="Reply to participant"
                  value={draft}
                  onChange={editDraft}
                  rows={3}
                  maxLength={4000}
                  isDisabled={!ready || busy || Boolean(pending)}
                />
                {pending && (
                  <Text type="supporting">
                    Delivery awaits confirmation. Retry reuses the same reply.
                    The reply is saved for this conversation in this browser
                    tab.
                  </Text>
                )}
                <HStack justify="end">
                  <Button
                    type="submit"
                    label={
                      busy ? "Sending…" : pending ? "Retry reply" : "Send reply"
                    }
                    variant="primary"
                    isLoading={busy}
                    isDisabled={!ready || busy || (!pending && !draft.trim())}
                  />
                </HStack>
              </VStack>
            </form>
          )}
          <HStack justify="end">
            <Button
              label={
                thread.status === "open" ? "Resolve issue" : "Reopen issue"
              }
              variant="secondary"
              isDisabled={
                !ready || busy || (Boolean(pending) && thread.status === "open")
              }
              onClick={() => void changeStatus()}
            />
          </HStack>
        </>
      )}
    </VStack>
  );
}
