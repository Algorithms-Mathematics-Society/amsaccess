"use client";

import { useCallback, useMemo, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link, LinkProvider } from "@astryxdesign/core/Link";
import { Divider } from "@astryxdesign/core/Divider";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { OrgAstryxTheme } from "@/components/org/OrgAstryxTheme";
import type { Fleet } from "@/components/org/FleetPanel";
import type { Contest, Problem } from "@/lib/orgTypes";
import { ContestsCard } from "./dashboard/ContestsCard";
import { JudgingCard, ProblemsCard } from "./dashboard/RailCards";
import { ScheduleCard, ScheduleUnavailable } from "./dashboard/ScheduleCard";
import {
  attentionItems,
  contestStats,
  hasPackage,
  type AttentionItem,
  type Severity,
} from "./dashboard/derive";
import { useNow, useWidthRem } from "./dashboard/useClock";
import { useRead } from "./dashboard/useRead";

// Shape checks for the three reads: a body of the wrong shape becomes that
// section's error instead of crashing the page.
const isRecord = (d: unknown): d is Record<string, unknown> =>
  typeof d === "object" && d !== null;

const isContest = (d: unknown): d is Contest =>
  isRecord(d) &&
  typeof d.uid === "string" &&
  typeof d.title === "string" &&
  typeof d.status === "string" &&
  typeof d.starts_at === "string" &&
  typeof d.ends_at === "string" &&
  typeof d.is_practice === "boolean" &&
  (typeof d.invite_code === "string" || d.invite_code === null) &&
  Array.isArray(d.problems) &&
  typeof d.verification_window_minutes === "number";

const isProblem = (d: unknown): d is Problem =>
  isRecord(d) &&
  typeof d.uid === "string" &&
  typeof d.title === "string" &&
  Array.isArray(d.versions) &&
  d.versions.every(
    (version) => isRecord(version) && typeof version.has_package === "boolean",
  );

const isContestList = (d: unknown): d is Contest[] =>
  Array.isArray(d) && d.every(isContest);

const isProblemList = (d: unknown): d is Problem[] =>
  Array.isArray(d) && d.every(isProblem);

const isFleet = (d: unknown): d is Fleet =>
  isRecord(d) &&
  typeof d.live === "number" &&
  typeof d.running_jobs === "number" &&
  typeof d.queued_jobs === "number" &&
  typeof d.desired === "number" &&
  (d.queue_waiting === null || typeof d.queue_waiting === "number") &&
  (d.override === null ||
    (isRecord(d.override) &&
      typeof d.override.mode === "string" &&
      typeof d.override.expires_at === "string")) &&
  (d.state === null ||
    (isRecord(d.state) && typeof d.state.stale === "boolean")) &&
  Array.isArray(d.upcoming) &&
  d.upcoming.every(
    (item) =>
      isRecord(item) &&
      typeof item.title === "string" &&
      typeof item.starts_at === "string" &&
      typeof item.ends_at === "string" &&
      typeof item.instances === "number" &&
      typeof item.reason === "string",
  );

const ATTENTION_SKELETON_CSS = `
[data-dash-attention-skeleton] {
  container-type: inline-size;
  --dash-attention-skeleton-h: calc(var(--spacing-10) * 5 + var(--spacing-5));
}
@container (min-width: 40rem) {
  [data-dash-attention-skeleton] > * { --dash-attention-skeleton-h: calc(var(--spacing-10) * 3 + var(--spacing-5)); }
}`;

/** Below this container width (rem) an error banner puts its action under the text. */
const BANNER_STACK_REM = 30;
/**
 * At a glance is two pairs of tiles. A pair sits beside the other once both
 * fit (four in a row), otherwise they stack (two by two), so the tiles never
 * split three and one. Pure CSS, so the server render already has the final
 * layout. Grid takes this minimum in px; it is written in rem.
 */
const GLANCE_PAIR_MIN_PX = 16 * 16;

/**
 * The organizer's front page. It answers, in order: does anything need me,
 * what is happening, and what is coming up. It reads three GET routes once
 * (plus Refresh and Retry) and never writes or polls. A one-minute clock
 * tick keeps relative times current without fetching.
 */
export function DashboardView() {
  return (
    <OrgAstryxTheme>
      <LinkProvider component={NextLink}>
        <Dashboard />
      </LinkProvider>
    </OrgAstryxTheme>
  );
}

function Dashboard() {
  const router = useRouter();
  const contests = useRead<Contest[]>("/api/org/contests", isContestList);
  const problems = useRead<Problem[]>("/api/org/problems", isProblemList);
  const fleet = useRead<Fleet>("/api/org/fleet", isFleet);
  // A clock tick, not a poll: it re-renders time text and the "today" date.
  const now = useNow();

  const loading = contests.loading || problems.loading || fleet.loading;
  const refresh = useCallback(() => {
    void Promise.all([contests.reload(), problems.reload(), fleet.reload()]);
  }, [contests, problems, fleet]);

  // Brand new organisation: nothing to monitor yet, so show the way in.
  // Wait for every read and keep the normal dashboard if any read failed,
  // because that is where its error and Retry control live.
  const isEmpty =
    contests.data !== null &&
    problems.data !== null &&
    fleet.data !== null &&
    contests.data.length === 0 &&
    problems.data.length === 0 &&
    !contests.error &&
    !problems.error &&
    !fleet.error;

  return (
    <VStack gap={0}>
      <HStack
        as="header"
        gap={4}
        justify="between"
        align="end"
        wrap="wrap"
        style={{
          background: "var(--color-background-card)",
          borderBlockEnd: "var(--border-width) solid var(--color-border)",
          padding: "var(--spacing-6) clamp(var(--spacing-3), 3vw, var(--spacing-8))",
        }}
      >
        <VStack gap={1} style={{ minWidth: 0 }}>
          <Heading level={1}>Dashboard</Heading>
          <Text type="supporting">
            What needs you, what is live, and what is coming up.
          </Text>
        </VStack>
        <HStack gap={2} align="center" wrap="wrap">
          <Button
            label="Refresh"
            variant="ghost"
            onClick={refresh}
            isLoading={
              loading && (contests.data !== null || problems.data !== null)
            }
          />
          <Button
            label="New contest"
            variant="primary"
            onClick={() => router.push("/org/contests")}
          />
        </HStack>
      </HStack>

      <VStack
        gap={6}
        style={{ padding: "var(--spacing-6) clamp(var(--spacing-3), 3vw, var(--spacing-8))", minWidth: 0 }}
      >
        {isEmpty ? (
          <GettingStarted
            problems={problems.data!.length}
            contests={contests.data!.length}
          />
        ) : (
          // Two columns when there is room (the rail keeps about 320px), one
          // column otherwise with the rail after the main content.
          <HStack gap={6} align="start" wrap="wrap">
            <VStack
              gap={6}
              style={{
                flex: "999 1 calc(var(--spacing-10) * 10)",
                minWidth: 0,
              }}
            >
              <NeedsAttention
                contests={contests.data}
                problems={problems.data}
                fleet={fleet.data}
                now={now}
                // Only the first load: a read that has answered once (with data
                // or an error) keeps its items on screen while it reloads.
                loading={[contests, problems, fleet].some(
                  (r) => r.data === null && !r.error,
                )}
                incomplete={Boolean(
                  contests.error || problems.error || fleet.error,
                )}
              />
              <AtAGlance
                contests={contests.data}
                problems={problems.data}
                now={now}
                contestsPending={contests.loading}
                problemsPending={problems.loading}
              />
              <ContestsCard
                contests={contests.data}
                error={contests.error}
                loading={contests.loading}
                now={now}
                onRetry={() => void contests.reload()}
              />
            </VStack>
            <VStack
              as="aside"
              aria-label="Judging, schedule and problems"
              gap={6}
              style={{ flex: "1 1 calc(var(--spacing-10) * 8)", minWidth: 0 }}
            >
              <JudgingCard
                fleet={fleet.data}
                error={fleet.error}
                loading={fleet.loading}
                contests={contests.data}
                now={now}
                onRetry={() => void fleet.reload()}
              />
              {contests.data ? (
                <ScheduleCard contests={contests.data} now={now} />
              ) : contests.loading ? (
                <RailSkeleton title="Schedule" />
              ) : (
                <ScheduleUnavailable />
              )}
              <ProblemsCard
                problems={problems.data}
                error={problems.error}
                loading={problems.loading}
                onRetry={() => void problems.reload()}
              />
            </VStack>
          </HStack>
        )}
      </VStack>
    </VStack>
  );
}

const DOT: Record<
  Exclude<Severity, "error">,
  { variant: "warning" | "success" | "neutral"; label: string }
> = {
  warning: { variant: "warning", label: "Needs action" },
  live: { variant: "success", label: "Live" },
  info: { variant: "neutral", label: "Note" },
};

function NeedsAttention({
  contests,
  problems,
  fleet,
  now,
  loading,
  incomplete,
}: {
  contests: Contest[] | null;
  problems: Problem[] | null;
  fleet: Fleet | null;
  now: number;
  loading: boolean;
  incomplete: boolean;
}) {
  const items = useMemo(
    () => attentionItems({ contests, problems, fleet, now }),
    [contests, problems, fleet, now],
  );
  const [measureRef, widthRem] = useWidthRem<HTMLDivElement>();
  const stackActions = widthRem !== null && widthRem < BANNER_STACK_REM;

  // Until every read has answered once, a partial list would grow item by
  // item and push the page down, so the placeholder stays.
  if (loading) {
    // Roughly the size of a heading and a two-item list (taller when narrow,
    // where the text wraps), so the page below does not jump on load.
    return (
      <div data-dash-attention-skeleton="" aria-hidden="true">
        <style>{ATTENTION_SKELETON_CSS}</style>
        <VStack gap={3}>
          <Skeleton width="30%" height="var(--spacing-5)" radius={1} />
          <Skeleton width="100%" height="var(--dash-attention-skeleton-h)" radius={2} index={1} />
        </VStack>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <HStack gap={2} align="center" role="status">
        <StatusDot
          variant={incomplete ? "neutral" : "success"}
          label={incomplete ? "Unknown" : "All clear"}
        />
        <Text>
          {incomplete
            ? "Some checks could not run. Refresh to try again."
            : "All clear. Nothing needs you right now."}
        </Text>
      </HStack>
    );
  }

  const errors = items.filter((i) => i.severity === "error");
  const rest = items.filter((i) => i.severity !== "error");

  return (
    <VStack as="section" gap={3} aria-labelledby="dash-attention-heading">
      <Heading level={4} accessibilityLevel={2} id="dash-attention-heading">
        Needs attention
      </Heading>
      <div ref={measureRef}>
        <VStack gap={3}>
          {errors.map((item) =>
            stackActions ? (
              // Narrow: the action goes under the text so the text keeps the full width.
              <Banner
                key={item.id}
                status="error"
                title={item.title}
                description={
                  <VStack gap={2} align="start">
                    <span>{item.detail}</span>
                    <ActionLink item={item} />
                  </VStack>
                }
              />
            ) : (
              <Banner
                key={item.id}
                status="error"
                title={item.title}
                description={item.detail}
                endContent={<ActionLink item={item} />}
              />
            ),
          )}
        </VStack>
      </div>
      {rest.length > 0 && (
        <Card padding={4}>
          <VStack as="ul" gap={3} aria-label="Items that need attention" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {rest.map((item, idx) => {
              const dot = DOT[item.severity as Exclude<Severity, "error">];
              return (
                <li key={item.id}>
                  {idx > 0 && <Divider />}
                  {/* Text and action sit side by side when there is room and stack when not. */}
                  <HStack
                    gap={3}
                    align="start"
                    style={{ paddingBlockStart: idx > 0 ? "var(--spacing-3)" : 0 }}
                  >
                    <span style={{ paddingBlockStart: "var(--spacing-1-5)", display: "inline-flex" }}>
                      <StatusDot variant={dot.variant} label={dot.label} />
                    </span>
                    <HStack gap={2} justify="between" align="center" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
                      <VStack gap={0.5} style={{ flex: "1 1 calc(var(--spacing-10) * 6)", minWidth: 0 }}>
                        <Text weight="medium">{item.title}</Text>
                        <Text type="supporting">{item.detail}</Text>
                      </VStack>
                      <ActionLink item={item} />
                    </HStack>
                  </HStack>
                </li>
              );
            })}
          </VStack>
        </Card>
      )}
      {incomplete && (
        <Text type="supporting">Some checks could not run. Refresh to try again.</Text>
      )}
    </VStack>
  );
}

function ActionLink({ item }: { item: AttentionItem }) {
  return (
    <Link href={item.href} color="primary" hasUnderline isStandalone>
      {item.action}
    </Link>
  );
}

function AtAGlance({
  contests,
  problems,
  now,
  contestsPending,
  problemsPending,
}: {
  contests: Contest[] | null;
  problems: Problem[] | null;
  now: number;
  contestsPending: boolean;
  problemsPending: boolean;
}) {
  const stats = contests ? contestStats(contests, now) : null;
  const ready = problems ? problems.filter(hasPackage).length : null;

  const tiles: { label: string; value: string | null; pending: boolean; of?: string }[] = [
    { label: "Running now", value: stats ? String(stats.running) : null, pending: contestsPending },
    {
      label: "Starting in next 24h",
      value: stats ? String(stats.next24h) : null,
      pending: contestsPending,
    },
    { label: "Drafts", value: stats ? String(stats.drafts) : null, pending: contestsPending },
    {
      label: "Problems ready",
      value: ready === null ? null : String(ready),
      pending: problemsPending,
      of: problems ? `of ${problems.length}` : undefined,
    },
  ];

  return (
    <Card padding={4} aria-labelledby="dash-glance-heading">
      <VStack gap={3}>
        <Heading level={4} accessibilityLevel={2} id="dash-glance-heading">
          At a glance
        </Heading>
        <Grid columns={{ minWidth: GLANCE_PAIR_MIN_PX, max: 2, repeat: "fit" }} gap={4}>
          {[tiles.slice(0, 2), tiles.slice(2)].map((pair) => (
            <Grid key={pair[0].label} columns={2} gap={4}>
              {pair.map((t) => (
                <VStack key={t.label} gap={1}>
                  <Text type="supporting">{t.label}</Text>
                  {t.value === null && !t.pending ? (
                    <Text type="supporting">Not loaded</Text>
                  ) : t.value === null ? (
                    <Skeleton
                      width="var(--spacing-10)"
                      height="calc(var(--spacing-8) + var(--spacing-1))"
                      radius={1}
                    />
                  ) : (
                    <HStack gap={1} style={{ alignItems: "baseline" }}>
                      <Text type="inherit" size="2xl" weight="semibold" hasTabularNumbers>
                        {t.value}
                      </Text>
                      {t.of && <Text type="supporting">{t.of}</Text>}
                    </HStack>
                  )}
                </VStack>
              ))}
            </Grid>
          ))}
        </Grid>
      </VStack>
    </Card>
  );
}

function RailSkeleton({ title }: { title: string }) {
  return (
    <Card padding={4} aria-label={`${title} loading`}>
      <VStack gap={3} aria-hidden="true">
        <Skeleton width="40%" height="var(--spacing-5)" radius={1} />
        <Skeleton
          width="100%"
          height="calc(var(--spacing-10) * 11)"
          radius={2}
          index={1}
        />
      </VStack>
    </Card>
  );
}

function GettingStarted({
  problems,
  contests,
}: {
  problems: number;
  contests: number;
}) {
  const steps = [
    {
      label: "Create a problem",
      description: "Upload its cxxprobe package. A problem is ready once its package is in.",
      done: problems > 0,
      href: "/org/problems",
      action: "Open problems",
    },
    {
      label: "Create a contest",
      description: "Pick a time and add your problems to it.",
      done: contests > 0,
      href: "/org/contests",
      action: "Open contests",
    },
    {
      label: "Add participants",
      description: "Use the Participants tab on the contest.",
      done: false,
    },
    {
      label: "Publish and share the invite code",
      description: "Participants join with the code once it is published.",
      done: false,
    },
  ];

  return (
    <Card
      padding={6}
      maxWidth="calc(var(--spacing-10) * 18)"
      aria-labelledby="dash-start-heading"
    >
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={4} accessibilityLevel={2} id="dash-start-heading">
            Get your first contest running
          </Heading>
          <Text type="supporting">
            Four steps, in this order. This page fills in as you go.
          </Text>
        </VStack>
        {/* Plain text rows, not ListItem: every step must wrap in full, never truncate. */}
        <VStack
          as="ol"
          // Explicit role: an unstyled list loses its semantics in Safari.
          role="list"
          gap={3}
          aria-label="Getting started steps"
          style={{ margin: 0, padding: 0, listStyle: "none" }}
        >
          {steps.map((s, idx) => (
            <li key={s.label}>
              {idx > 0 && <Divider />}
              <HStack
                gap={3}
                align="start"
                style={{ paddingBlockStart: idx > 0 ? "var(--spacing-3)" : 0 }}
              >
                <Text type="supporting" hasTabularNumbers aria-hidden="true">
                  {idx + 1}.
                </Text>
                <HStack gap={2} justify="between" align="center" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
                  <VStack gap={0.5} style={{ flex: "1 1 calc(var(--spacing-10) * 6)", minWidth: 0 }}>
                    <Text weight="medium">{s.label}</Text>
                    <Text type="supporting">{s.description}</Text>
                  </VStack>
                  {s.done ? (
                    <HStack gap={1} align="center">
                      <Icon icon="success" size="sm" color="success" />
                      <Text type="supporting">Done</Text>
                    </HStack>
                  ) : s.href ? (
                    <Link href={s.href} color="primary" hasUnderline isStandalone>
                      {s.action}
                    </Link>
                  ) : null}
                </HStack>
              </HStack>
            </li>
          ))}
        </VStack>
      </VStack>
    </Card>
  );
}
