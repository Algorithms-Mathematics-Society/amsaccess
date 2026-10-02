"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Banner } from "@astryxdesign/core/Banner";
import type { Contest, Problem } from "@/lib/orgTypes";
import { relativeWhen } from "@/lib/orgTypes";
import { situationOf, type Fleet } from "@/components/org/FleetPanel";
import { hasPackage, nextContest } from "./derive";

type DotVariant = "success" | "warning" | "error" | "neutral";

/** Dashboard wording for each of FleetPanel's named situations. */
function judgingSummary(
  fleet: Fleet,
  liveContest: boolean,
): { dot: DotVariant; headline: string; detail: string } {
  const s = situationOf(fleet);
  switch (s.kind) {
    case "waiting": {
      const waiting = fleet.queue_waiting ?? fleet.queued_jobs ?? 0;
      return {
        dot: "error",
        headline: "Submissions are waiting",
        detail: `${waiting} waiting and no judge is answering.`,
      };
    }
    case "standdown":
      return {
        dot: "warning",
        headline: "Judging is switched off",
        detail: "Nothing is judged until it is turned back on.",
      };
    case "stale":
      return {
        dot: "warning",
        headline: "Judges are not being steered",
        detail:
          "They keep judging, but will not scale up or stop on their own.",
      };
    case "ready":
      return {
        dot: "success",
        headline: `Ready · ${fleet.live} ${fleet.live === 1 ? "judge" : "judges"} available`,
        detail:
          fleet.running_jobs > 0
            ? `${fleet.running_jobs} ${fleet.running_jobs === 1 ? "submission" : "submissions"} being judged now.`
            : "Judges stop on their own after a contest.",
      };
    case "starting":
      return {
        dot: liveContest ? "warning" : "neutral",
        headline: "Judges are starting up",
        detail: "They take about 90 seconds to be ready.",
      };
    default:
      return {
        dot: "neutral",
        headline: "No judges running",
        detail: "They start on their own about half an hour before a contest.",
      };
  }
}

export function JudgingCard({
  fleet,
  error,
  loading,
  contests,
  onRetry,
}: {
  fleet: Fleet | null;
  error: string;
  loading: boolean;
  contests: Contest[] | null;
  onRetry: () => void;
}) {
  const now = Date.now();
  const live = (contests ?? []).some((c) => c.status === "running");
  const next = contests ? nextContest(contests, now) : null;
  const nextLine = next
    ? { title: next.title, when: relativeWhen(next.starts_at) }
    : fleet?.upcoming[0]
      ? {
          title: fleet.upcoming[0].title,
          when: relativeWhen(fleet.upcoming[0].starts_at),
        }
      : null;

  return (
    <Card padding={4} aria-labelledby="dash-judging-heading">
      <VStack gap={3}>
        <Heading level={4} accessibilityLevel={2} id="dash-judging-heading">
          Judging
        </Heading>
        {fleet ? (
          (() => {
            const j = judgingSummary(fleet, live);
            return (
              <VStack gap={1} role="status">
                <HStack gap={2} align="center">
                  <StatusDot variant={j.dot} label={j.headline} />
                  <Text weight="medium">{j.headline}</Text>
                </HStack>
                <Text type="supporting">{j.detail}</Text>
              </VStack>
            );
          })()
        ) : loading ? (
          <VStack gap={2} aria-hidden="true">
            <Skeleton width="70%" height="var(--spacing-4)" radius={1} />
            <Skeleton
              width="90%"
              height="var(--spacing-3)"
              radius={1}
              index={1}
            />
          </VStack>
        ) : (
          <HStack gap={2} align="center" justify="between" wrap="wrap">
            <HStack gap={2} align="center">
              <StatusDot variant="neutral" label="Unknown" />
              <Text weight="medium">Judging status unavailable</Text>
            </HStack>
            <Button
              label="Retry"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              isLoading={loading}
            />
          </HStack>
        )}
        {fleet && error && (
          <Text type="supporting">
            Could not refresh. Showing the last status.
          </Text>
        )}
        {nextLine && (
          <VStack gap={0.5}>
            <Text type="supporting">Next contest</Text>
            <Text>{nextLine.title}</Text>
            <Text type="supporting">Starts {nextLine.when}</Text>
          </VStack>
        )}
        <Link href="/org/fleet" color="primary" hasUnderline isStandalone>
          Open Judging
        </Link>
      </VStack>
    </Card>
  );
}

/** Problems that still need a package; the rest are ready to use. */
export function ProblemsCard({
  problems,
  error,
  loading,
  onRetry,
}: {
  problems: Problem[] | null;
  error: string;
  loading: boolean;
  onRetry: () => void;
}) {
  const missing = (problems ?? []).filter((p) => !hasPackage(p));
  const ready = (problems ?? []).length - missing.length;

  return (
    <Card padding={4} aria-labelledby="dash-problems-heading">
      <VStack gap={3}>
        <Heading level={4} accessibilityLevel={2} id="dash-problems-heading">
          Problems
        </Heading>
        {error && (
          <Banner
            status="error"
            title="Problems did not load"
            description={problems ? "Showing the last list we had." : undefined}
            endContent={
              <Button
                label="Retry"
                size="sm"
                onClick={onRetry}
                isLoading={loading}
              />
            }
          />
        )}
        {problems === null ? (
          loading ? (
            <VStack gap={2} aria-hidden="true">
              <Skeleton width="50%" height="var(--spacing-4)" radius={1} />
              <Skeleton
                width="80%"
                height="var(--spacing-3)"
                radius={1}
                index={1}
              />
              <Skeleton
                width="70%"
                height="var(--spacing-3)"
                radius={1}
                index={2}
              />
            </VStack>
          ) : null
        ) : (
          <>
            <Text>
              <Text weight="medium" hasTabularNumbers>
                {ready} of {problems.length}
              </Text>{" "}
              ready to use
            </Text>
            {missing.length > 0 ? (
              <VStack gap={1}>
                <Text type="supporting">Waiting for a package:</Text>
                <List
                  density="compact"
                  hasDividers
                  aria-label="Problems without a package"
                >
                  {missing.slice(0, 5).map((p) => (
                    <ListItem
                      key={p.uid}
                      label={p.title}
                      style={{ paddingInline: 0 }}
                    />
                  ))}
                </List>
                {missing.length > 5 && (
                  <Text type="supporting">and {missing.length - 5} more</Text>
                )}
              </VStack>
            ) : (
              problems.length > 0 && (
                <Text type="supporting">Every problem has a package.</Text>
              )
            )}
          </>
        )}
        <Link href="/org/problems" color="primary" hasUnderline isStandalone>
          Open problems
        </Link>
      </VStack>
    </Card>
  );
}
