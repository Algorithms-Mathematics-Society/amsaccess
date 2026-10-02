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
import { List, ListItem } from "@astryxdesign/core/List";
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
import { ScheduleCard } from "./dashboard/ScheduleCard";
import {
  attentionItems,
  contestStats,
  hasPackage,
  type AttentionItem,
  type Severity,
} from "./dashboard/derive";
import { useRead } from "./dashboard/useRead";

/**
 * The organizer's front page. It answers, in order: does anything need me,
 * what is happening, and what is coming up. It reads three GET routes once
 * (plus Refresh) and never writes or polls.
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
  const contests = useRead<Contest[]>("/api/org/contests");
  const problems = useRead<Problem[]>("/api/org/problems");
  const fleet = useRead<Fleet>("/api/org/fleet");

  const loading = contests.loading || problems.loading || fleet.loading;
  const refresh = useCallback(() => {
    void Promise.all([contests.reload(), problems.reload(), fleet.reload()]);
  }, [contests, problems, fleet]);

  // Brand new organisation: nothing to monitor yet, so show the way in.
  const isEmpty =
    contests.data !== null &&
    problems.data !== null &&
    contests.data.length === 0 &&
    problems.data.length === 0;

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
                loading={
                  loading &&
                  (contests.data === null ||
                    problems.data === null ||
                    fleet.data === null)
                }
                incomplete={Boolean(
                  contests.error || problems.error || fleet.error,
                )}
              />
              <AtAGlance
                contests={contests.data}
                problems={problems.data}
                contestsPending={contests.loading}
                problemsPending={problems.loading}
              />
              <ContestsCard
                contests={contests.data}
                error={contests.error}
                loading={contests.loading}
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
                onRetry={() => void fleet.reload()}
              />
              {contests.data ? (
                <ScheduleCard contests={contests.data} />
              ) : contests.loading ? (
                <RailSkeleton title="Schedule" />
              ) : null}
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
  loading,
  incomplete,
}: {
  contests: Contest[] | null;
  problems: Problem[] | null;
  fleet: Fleet | null;
  loading: boolean;
  incomplete: boolean;
}) {
  const now = Date.now();
  const items = useMemo(
    () => attentionItems({ contests, problems, fleet, now }),
    // `now` is read per render on purpose; the list only changes with data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contests, problems, fleet],
  );

  if (loading && items.length === 0) {
    return (
      <VStack gap={2} aria-hidden="true">
        <Skeleton width="30%" height="var(--spacing-5)" radius={1} />
        <Skeleton
          width="100%"
          height="var(--spacing-12)"
          radius={2}
          index={1}
        />
      </VStack>
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
      {errors.map((item) => (
        <Banner
          key={item.id}
          status="error"
          title={item.title}
          description={
            <>
              {item.detail} <ActionLink item={item} />
            </>
          }
        />
      ))}
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
  contestsPending,
  problemsPending,
}: {
  contests: Contest[] | null;
  problems: Problem[] | null;
  contestsPending: boolean;
  problemsPending: boolean;
}) {
  const stats = contests ? contestStats(contests, Date.now()) : null;
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
        <Grid columns={{ minWidth: 128, repeat: "fit" }} gap={4}>
          {tiles.map((t) => (
            <VStack key={t.label} gap={1}>
              <Text type="supporting">{t.label}</Text>
              {t.value === null && !t.pending ? (
                <Text type="supporting">Not loaded</Text>
              ) : t.value === null ? (
                <Skeleton
                  width="var(--spacing-10)"
                  height="var(--spacing-6)"
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
          height="calc(var(--spacing-10) * 6)"
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
      label: "Create a problem and upload its cxxprobe package",
      description: "A problem is ready once its package is in.",
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
        <List
          listStyle="decimal"
          hasDividers
          aria-label="Getting started steps"
        >
          {steps.map((s) => (
            <ListItem
              key={s.label}
              label={s.label}
              description={s.description}
              endContent={
                s.done ? (
                  <HStack gap={1} align="center">
                    <Icon icon="success" size="sm" color="success" />
                    <Text type="supporting">Done</Text>
                  </HStack>
                ) : s.href ? (
                  <Link href={s.href} color="primary" hasUnderline isStandalone>
                    {s.action}
                  </Link>
                ) : undefined
              }
            />
          ))}
        </List>
      </VStack>
    </Card>
  );
}
