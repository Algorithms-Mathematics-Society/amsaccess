"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { Button } from "@astryxdesign/core/Button";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Banner } from "@astryxdesign/core/Banner";
import { startOrgSupportPolling } from "@/lib/client/orgPolling";
import { fetchOrgMe, useOrgRole } from "@/lib/client/useOrgRole";
import {
  supportApi,
  loadSupportAssignees,
  assignSupport,
  loadSupportNotes,
  type SupportStaff,
  type SupportNote,
  loadSupportInbox,
  loadSupportThread,
  type SupportInbox as InboxData,
  type SupportThread,
  type SupportSummary,
} from "@/lib/client/support";
import { ContestReadProvider } from "@/lib/client/useContestRead";
import { ParticipantModal } from "./ParticipantModal";
import {
  readSupportDraft,
  saveSupportDraft,
  acknowledgeSupportReply,
} from "@/lib/client/support-draft";
import { OrgAstryxTheme } from "./OrgAstryxTheme";

const messageError = (e: unknown) =>
  e instanceof Error ? e.message : "Unable to load support.";

function trustedPerson(ticket: SupportSummary) {
  const uuid =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  return typeof ticket.user_uid === "string" &&
    uuid.test(ticket.user_uid) &&
    typeof ticket.contest_uid === "string" &&
    uuid.test(ticket.contest_uid)
    ? { userUid: ticket.user_uid, contestUid: ticket.contest_uid }
    : null;
}

/** Visible on the main dashboard, independently of any contest. */
export function SupportAttention() {
  const router = useRouter();
  const { role, known } = useOrgRole();
  const [data, setData] = useState<InboxData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!known || role === "intern" || !role) return;
    let stopped = false;
    const stop = startOrgSupportPolling(
      async (signal) => {
        try {
          const d = await loadSupportInbox("open", undefined, signal);
          if (!stopped) {
            setData(d);
            setError("");
          }
        } catch (e) {
          if (!stopped) setError(messageError(e));
          throw e;
        }
      },
      { minimumMs: 30000, maximumMs: 45000 },
    );
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
  const { role, known } = useOrgRole();
  const [person, setPerson] = useState<{
    userUid: string;
    contestUid: string;
  } | null>(null);
  const canReadPerson =
    known &&
    [
      "owner",
      "admin",
      "problemsetter",
      "contest_manager",
      "judge_manager",
    ].includes(role ?? "");
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors.at(-1);
  const pageIds = useRef(new Map<string | undefined, Set<string>>());
  const [data, setData] = useState<InboxData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const revealDetail = () => {
    const detail = detailRef.current;
    const list = detail?.previousElementSibling;
    if (
      !detail ||
      !list ||
      detail.getBoundingClientRect().top <= list.getBoundingClientRect().top + 1
    )
      return;
    detail.focus({ preventScroll: true });
    detail.scrollIntoView({ block: "start", behavior: "instant" });
  };
  useEffect(() => {
    if (selected) revealDetail();
  }, [selected]);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const reset = () => {
      setPerson(null);
      setSelected(null);
      setData(null);
    };
    window.addEventListener("ams:org-session-reset", reset);
    window.addEventListener("ams:org-signed-out", reset);
    return () => {
      window.removeEventListener("ams:org-session-reset", reset);
      window.removeEventListener("ams:org-signed-out", reset);
    };
  }, []);
  // Opened from a contest's issues inbox as /org/support?t=<ticket uid>; read after hydration.
  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("t");
    if (
      ticket &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        ticket,
      )
    )
      setSelected(ticket);
  }, []);
  useEffect(() => {
    let stopped = false;
    setData(null);
    setError("");
    const stop = startOrgSupportPolling(
      async (signal) => {
        try {
          const d = await loadSupportInbox(filter, cursor, signal);
          if (!stopped) {
            if (!cursor) pageIds.current.clear();
            const earlier = cursors
              .slice(0, -1)
              .flatMap((token) => [...(pageIds.current.get(token) ?? [])]);
            if (
              d.items.some((item) => earlier.includes(item.uid)) ||
              (d.has_more && cursors.includes(d.next_cursor!))
            )
              throw new Error(
                "The support inbox did not advance. Refresh to retry.",
              );
            pageIds.current.set(
              cursor,
              new Set(d.items.map((item) => item.uid)),
            );
            setData(d);
            setError("");
          }
        } catch (e) {
          if (!stopped) setError(messageError(e));
          throw e;
        }
      },
      { minimumMs: 15000, maximumMs: 20000 },
    );
    return () => {
      stopped = true;
      stop();
    };
  }, [filter, cursor, refresh]);
  return (
    <VStack gap={6} style={{ padding: "var(--spacing-6)", minWidth: 0 }}>
      <HStack justify="between" gap={4} align="center" wrap="wrap">
        <VStack gap={1}>
          <Heading level={1}>Participant support</Heading>
          <Text color="secondary">
            Login, device and assessment issues across all contests.
          </Text>
          <Text type="supporting">
            Newest tickets first. Refresh to include new arrivals.
          </Text>
        </VStack>
        <Button
          label="Refresh inbox"
          variant="secondary"
          onClick={() => {
            setCursors([undefined]);
            setRefresh((n) => n + 1);
          }}
        />
      </HStack>
      <HStack gap={2}>
        <Button
          label="Open issues"
          aria-pressed={filter === "open"}
          variant={filter === "open" ? "primary" : "secondary"}
          onClick={() => {
            setFilter("open");
            setCursors([undefined]);
          }}
        />
        <Button
          label="Resolved"
          aria-pressed={filter === "resolved"}
          variant={filter === "resolved" ? "primary" : "secondary"}
          onClick={() => {
            setFilter("resolved");
            setCursors([undefined]);
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
                {canReadPerson && trustedPerson(item) && (
                  <Button
                    label="View participant"
                    variant="ghost"
                    onClick={() => setPerson(trustedPerson(item))}
                  />
                )}
                <Text type="supporting">
                  {item.category.toLowerCase().replaceAll("_", " ")}
                </Text>
              </HStack>
              {item.chat_enabled === false && (
                <Text type="supporting">One-way · contact-only</Text>
              )}
              <Text type="supporting">
                {item.email} · {item.phone}
              </Text>
              <Text type="supporting">
                Updated {new Date(item.updated_at).toLocaleString()}
              </Text>
              <Button
                label={
                  selected === item.uid
                    ? item.chat_enabled === false
                      ? "Viewing one-way issue"
                      : "Viewing conversation"
                    : item.chat_enabled === false
                      ? `View issue from ${item.name}`
                      : `Open conversation with ${item.name}`
                }
                variant={selected === item.uid ? "primary" : "secondary"}
                onClick={() => {
                  if (selected === item.uid) revealDetail();
                  else setSelected(item.uid);
                }}
              />
            </VStack>
          ))}
          <HStack gap={3} style={{ paddingBlock: "var(--spacing-4)" }}>
            <Button
              label="Previous issues"
              variant="ghost"
              isDisabled={cursors.length === 1}
              onClick={() => setCursors((values) => values.slice(0, -1))}
            />
            <Button
              label="Next issues"
              variant="ghost"
              isDisabled={!data?.has_more}
              onClick={() => {
                if (data?.next_cursor && !cursors.includes(data.next_cursor))
                  setCursors((values) => [...values, data.next_cursor!]);
              }}
            />
          </HStack>
        </VStack>
        <div
          ref={detailRef}
          role="region"
          aria-label="Support conversation"
          tabIndex={-1}
          className="scroll-mt-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-500"
          style={{ flex: "2 1 calc(var(--spacing-10) * 12)", minWidth: 0 }}
        >
          {selected ? (
            <Conversation
              key={selected}
              uid={selected}
              onChange={() => setRefresh((n) => n + 1)}
              onOpenPerson={
                canReadPerson
                  ? (ticket) => setPerson(trustedPerson(ticket))
                  : undefined
              }
            />
          ) : (
            <Text color="secondary">
              Select an issue to read the conversation and reply.
            </Text>
          )}
        </div>
      </HStack>
      {person && canReadPerson && (
        <ContestReadProvider
          key={person.contestUid}
          contestUid={person.contestUid}
        >
          <ParticipantModal
            handle={person.userUid}
            onClose={() => setPerson(null)}
            contest={{ uid: person.contestUid, live: true }}
          />
        </ContestReadProvider>
      )}
    </VStack>
  );
}

export function Conversation({
  uid,
  onChange,
  person,
  onOpenPerson,
}: {
  uid: string;
  onChange: () => void;
  person?: { userUid: string; contestUid: string };
  onOpenPerson?: (ticket: SupportSummary) => void;
}) {
  const scopedUserUid = person?.userUid;
  const scopedContestUid = person?.contestUid;
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ uid: string; body: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    "open" | "resolved" | null
  >(null);
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
    const stop = startOrgSupportPolling(
      async (signal) => {
        try {
          let more = true;
          for (let page = 0; more && page < 3 && !stopped; page += 1) {
            const last = messages.current.at(-1)?.uid;
            const d = await loadSupportThread(uid, last, signal);
            if (stopped) return;
            if (
              scopedUserUid &&
              (d.user_uid !== scopedUserUid ||
                d.contest_uid !== scopedContestUid)
            ) {
              messages.current = [];
              setThread(null);
              throw new Error(
                "This ticket is no longer linked to the selected participant and contest.",
              );
            }
            const seen = new Set(messages.current.map((m) => m.uid));
            const nextMessages = [
              ...messages.current,
              ...d.messages.filter((m) => !seen.has(m.uid)),
            ];
            if (d.has_more && nextMessages.at(-1)?.uid === last) {
              throw new Error(
                "Chat history did not advance. Refresh to retry.",
              );
            }
            messages.current = nextMessages;
            setThread({ ...d, messages: messages.current });
            setReadError("");
            more = d.has_more;
          }
        } catch (e) {
          if (!stopped) {
            if ([401, 403].includes((e as { status?: number })?.status ?? 0)) {
              messages.current = [];
              setThread(null);
            }
            setReadError(messageError(e));
          }
          throw e;
        }
      },
      { minimumMs: 4000, maximumMs: 6000 },
    );
    return () => {
      stopped = true;
      stop();
    };
  }, [uid, refresh, scopedUserUid, scopedContestUid]);
  useEffect(() => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
  }, [thread?.messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (
      !ready ||
      inFlight.current ||
      (person &&
        (!thread ||
          thread.user_uid !== person.userUid ||
          thread.contest_uid !== person.contestUid)) ||
      thread?.chat_enabled === false ||
      (!pending && thread?.status !== "open")
    )
      return;
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
    if (
      person &&
      (thread.user_uid !== person.userUid ||
        thread.contest_uid !== person.contestUid)
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const desired =
      pendingStatus ?? (thread.status === "open" ? "resolved" : "open");
    setPendingStatus(desired);
    try {
      const ack = await supportApi<{ uid: string; status: string }>(
        `/${uid}`,
        "PATCH",
        {
          status: desired,
        },
      );
      if (ack.uid !== uid || ack.status !== desired)
        throw new Error(
          "Status change was not confirmed. Retry the same action safely.",
        );
      if (!mounted.current) return;
      setPendingStatus(null);
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
          {onOpenPerson && trustedPerson(thread) && (
            <Button
              label="View participant"
              variant="secondary"
              onClick={() => onOpenPerson(thread)}
            />
          )}
          <Text>
            {thread.email} · {thread.phone}
          </Text>
          {thread.contest_uid && (
            <Text type="supporting">Contest context: {thread.contest_uid}</Text>
          )}
          <Text type="supporting">
            Contact details are self-reported and unverified. Never use this
            chat alone to authorize a credential reset.
          </Text>
          {thread.chat_enabled === false && (
            <Banner
              status="info"
              title="One-way contact-only issue"
              description="Participant chat is unavailable for this issue. Follow up with the participant by email or phone using the contact details above."
            />
          )}
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
          {thread.chat_enabled !== false &&
            thread.status === "resolved" &&
            pending && (
              <Banner
                status="warning"
                title="Reply awaiting confirmation"
                description="This issue is resolved. Retry the saved reply to confirm delivery without reopening it. If the server says it was not sent, reopen the issue before retrying."
              />
            )}
          {thread.chat_enabled !== false &&
            (thread.status === "open" || pending) && (
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
                        busy
                          ? "Sending…"
                          : pending
                            ? "Retry reply"
                            : "Send reply"
                      }
                      variant="primary"
                      isLoading={busy}
                      isDisabled={!ready || busy || (!pending && !draft.trim())}
                    />
                  </HStack>
                </VStack>
              </form>
            )}
          <StaffTools key={uid} thread={thread} onChange={onChange} />
          <HStack justify="end">
            <Button
              label={
                pendingStatus
                  ? pendingStatus === "resolved"
                    ? "Retry resolve"
                    : "Retry reopen"
                  : thread.status === "open"
                    ? "Resolve issue"
                    : "Reopen issue"
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

/** Staff-only endpoints keep private notes out of the participant conversation. */
function StaffTools({
  thread,
  onChange,
}: {
  thread: SupportThread;
  onChange: () => void;
}) {
  const uid = thread.uid;
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [staff, setStaff] = useState<SupportStaff[]>([]);
  const [assignee, setAssignee] = useState(thread.assignee?.uid ?? "");
  const assignmentDirty = useRef(false);
  useEffect(() => {
    if (!assignmentDirty.current) setAssignee(thread.assignee?.uid ?? "");
  }, [thread.assignee?.uid]);
  const [notes, setNotes] = useState<SupportNote[]>([]);
  const history = useRef<SupportNote[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ uid: string; body: string } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [invalidated, setInvalidated] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    mounted.current = true;
    const reset = () => {
      mounted.current = false;
      setInvalidated(true);
      setReady(false);
      setDraft("");
      setPending(null);
      setNotes([]);
      setStaff([]);
      history.current = [];
    };
    if (typeof window !== "undefined") {
      window.addEventListener("ams:org-session-reset", reset);
      window.addEventListener("ams:org-signed-out", reset);
    }
    void fetchOrgMe(true).then((me) => {
      if (!mounted.current) return;
      if (typeof me?.uid !== "string" || !me.uid) {
        setReadError("Sign in again to access staff coordination.");
        return;
      }
      const key = `${uid}:internal-note:${me.uid}`;
      setDraftKey(key);
      try {
        const saved = readSupportDraft(sessionStorage, key);
        setDraft(saved.draft);
        setPending(saved.pending);
      } catch {
        setStorageWarning(
          "Note recovery is unavailable. Keep this ticket open until delivery is confirmed.",
        );
      }
    });
    return () => {
      mounted.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("ams:org-session-reset", reset);
        window.removeEventListener("ams:org-signed-out", reset);
      }
    };
  }, [uid]);
  useEffect(() => {
    let stopped = false;
    const stop = startOrgSupportPolling(
      async (signal) => {
        try {
          const eligible = await loadSupportAssignees(uid, signal);
          if (stopped || !mounted.current) return;
          setStaff(eligible);
          let more = true;
          for (let page = 0; more && page < 3; page += 1) {
            const after = history.current.at(-1)?.uid;
            const data = await loadSupportNotes(uid, after, signal);
            if (stopped || !mounted.current) return;
            const seen = new Set(history.current.map((note) => note.uid));
            const added = data.notes.filter((note) => !seen.has(note.uid));
            if (
              data.has_more &&
              (!added.length || data.next_cursor !== added.at(-1)?.uid)
            )
              throw new Error(
                "Internal notes did not advance. Refresh to retry.",
              );
            history.current = [...history.current, ...added];
            setNotes(history.current);
            more = data.has_more;
          }
          if (draftKey) setReady(true);
          setReadError("");
        } catch (failure) {
          if (!stopped) {
            if (
              [401, 403].includes((failure as { status?: number })?.status ?? 0)
            ) {
              history.current = [];
              setNotes([]);
              setStaff([]);
              setReady(false);
            }
            setReadError(messageError(failure));
          }
          throw failure;
        }
      },
      { minimumMs: 4000, maximumMs: 6000 },
    );
    return () => {
      stopped = true;
      stop();
    };
  }, [uid, refresh, draftKey]);
  function persist(value: string, reply: { uid: string; body: string } | null) {
    if (!draftKey || !mounted.current) return;
    try {
      saveSupportDraft(sessionStorage, draftKey, {
        draft: value,
        pending: reply,
      });
    } catch {
      setStorageWarning(
        "Note recovery is unavailable. Keep this ticket open until delivery is confirmed.",
      );
    }
  }
  async function saveAssignment() {
    if (inFlight.current || !ready || !mounted.current || !draftKey) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await assignSupport(uid, assignee || null);
      if (!mounted.current) return;
      assignmentDirty.current = false;
      onChange();
      setRefresh((value) => value + 1);
    } catch (failure) {
      if (mounted.current) setError(messageError(failure));
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function sendNote(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !ready || !mounted.current || !draftKey) return;
    const note = pending ?? { uid: crypto.randomUUID(), body: draft.trim() };
    if (!note.body) return;
    inFlight.current = true;
    setBusy(true);
    setPending(note);
    persist(draft, note);
    setError("");
    try {
      const ack = await supportApi<{ uid: string }>(
        `/${uid}/notes`,
        "POST",
        note,
      );
      if (ack.uid !== note.uid)
        throw new Error("Note delivery was not confirmed. Retry safely.");
      try {
        acknowledgeSupportReply(sessionStorage, draftKey, note.uid);
      } catch {
        if (mounted.current)
          setStorageWarning(
            "Note sent, but saved draft could not be cleared. Check notes before sending after a reload.",
          );
      }
      if (!mounted.current) return;
      setPending(null);
      setDraft("");
      setRefresh((value) => value + 1);
      onChange();
    } catch (failure) {
      if (mounted.current) setError(messageError(failure));
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  if (invalidated)
    return (
      <Text role="status">Sign in again to access staff coordination.</Text>
    );
  return (
    <VStack gap={3}>
      <Heading level={3}>Staff coordination</Heading>
      <Text type="supporting">
        Assignment and internal notes are visible only to staff. Notes are never
        sent to the participant.
      </Text>
      {storageWarning && <Text role="status">{storageWarning}</Text>}
      {readError && <Text role="status">{readError}</Text>}
      {error && <Text role="alert">{error}</Text>}
      <label>
        Assigned staff
        <select
          aria-label="Assigned staff"
          value={assignee}
          disabled={!ready || busy}
          onChange={(event) => {
            assignmentDirty.current = true;
            setAssignee(event.target.value);
          }}
        >
          <option value="">Unassigned</option>
          {thread.assignee &&
            !staff.some((person) => person.uid === thread.assignee?.uid) && (
              <option value={thread.assignee.uid} disabled>
                {thread.assignee.display_name || thread.assignee.email}{" "}
                (unavailable)
              </option>
            )}
          {staff.map((person) => (
            <option key={person.uid} value={person.uid}>
              {person.display_name || person.email}
            </option>
          ))}
        </select>
      </label>
      <Button
        label="Save assignment"
        variant="secondary"
        isDisabled={!ready || busy}
        onClick={() => void saveAssignment()}
      />
      <VStack role="log" aria-label="Internal staff notes" gap={2}>
        {notes.map((note) => (
          <VStack key={note.uid} gap={1}>
            <Text type="supporting">
              {note.author?.display_name || note.author?.email || "Staff note"}{" "}
              · {new Date(note.created_at).toLocaleString()}
            </Text>
            <Text style={{ whiteSpace: "pre-wrap" }}>{note.body}</Text>
          </VStack>
        ))}
      </VStack>
      <form onSubmit={(event) => void sendNote(event)}>
        <VStack gap={2}>
          <TextArea
            label="Internal note (staff only)"
            value={draft}
            rows={3}
            maxLength={4000}
            isDisabled={!ready || busy || Boolean(pending)}
            onChange={(value) => {
              setDraft(value);
              persist(value, pending);
            }}
          />
          {pending && (
            <Text type="supporting">
              Delivery awaits confirmation. Retry reuses the same private note.
            </Text>
          )}
          <Button
            type="submit"
            label={pending ? "Retry internal note" : "Add internal note"}
            isDisabled={!ready || busy || (!pending && !draft.trim())}
          />
        </VStack>
      </form>
    </VStack>
  );
}
