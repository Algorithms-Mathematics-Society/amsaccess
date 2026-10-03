"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import {
  Table,
  proportional,
  type TableColumn,
  type TablePlugin,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import type { Contest } from "@/lib/orgTypes";
import { formatWhen, relativeWhen } from "@/lib/orgTypes";
import { filterContests, orderContests, type ContestFilter } from "./derive";
import { useWidthRem } from "./useClock";

/** Rows shown before "View all contests" takes over. */
const CAP = 8;

/**
 * The table changes layout with its container instead of letting columns
 * slide out of view, moving low-priority details into the Contest cell:
 * - wide: Contest, Status, Starts, Problems, Invite code;
 * - medium: Contest (with problems and code below), Status, Starts;
 * - narrow: Contest (with start time, problems and code below), Status.
 *
 * Column minimums are in rem (the Table API takes px). The Table keeps every
 * column at or above its minimum by scaling the whole row by the tightest
 * min/share ratio, so each column's share equals its minimum and a layout
 * needs exactly the sum of its minimums. The Table also bleeds into the
 * card's padding, so it is 2rem wider than the measured box.
 */
const REM_PX = 16;
const MIN_REM = { title: 10, status: 7, starts: 9, problems: 5.5, invite: 7 };
const col = (rem: number) => proportional(rem, { minWidth: rem * REM_PX });
const TABLE_BLEED_REM = 2;
/** Medium: its three minimums plus a little slack. */
const MEDIUM_REM = MIN_REM.title + MIN_REM.status + MIN_REM.starts + 1 - TABLE_BLEED_REM;
/** Wide: all five minimums plus room for the start time to sit on one line. */
const WIDE_REM =
  MIN_REM.title + MIN_REM.status + MIN_REM.starts + MIN_REM.problems + MIN_REM.invite + 4 - TABLE_BLEED_REM;

type Layout = "wide" | "medium" | "narrow";

/**
 * Skeleton rows as tall as the loaded rows: narrow rows carry the start time
 * under the title. A container query, because the skeleton is in the server
 * render, before anything can be measured.
 */
const SKELETON_CSS = `
[data-dash-contests] { container-type: inline-size; }
[data-dash-skeleton-row] { height: calc(var(--spacing-10) * 2 + var(--spacing-5)); }
@container (min-width: ${MEDIUM_REM}rem) {
  [data-dash-skeleton-row] { height: calc(var(--spacing-10) + var(--spacing-5)); }
}`;

function layoutFor(widthRem: number | null): Layout {
  if (widthRem === null || widthRem >= WIDE_REM) return "wide";
  return widthRem >= MEDIUM_REM ? "medium" : "narrow";
}

const FILTERS: { value: ContestFilter; label: string; empty: string }[] = [
  { value: "all", label: "All", empty: "No contests yet." },
  { value: "live", label: "Live", empty: "Nothing is live right now." },
  { value: "upcoming", label: "Upcoming", empty: "Nothing is scheduled." },
  { value: "drafts", label: "Drafts", empty: "No drafts." },
  { value: "ended", label: "Ended", empty: "No ended contests yet." },
];

type TokenColor = "green" | "blue" | "gray" | "default";

const STATUS: Record<string, { label: string; color: TokenColor }> = {
  running: { label: "Live", color: "green" },
  scheduled: { label: "Scheduled", color: "blue" },
  draft: { label: "Draft", color: "gray" },
  ended: { label: "Ended", color: "default" },
  archived: { label: "Archived", color: "default" },
};

function statusOf(status: string) {
  return (
    STATUS[status] ?? {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      color: "default",
    }
  );
}

function validDate(iso: string): boolean {
  return !Number.isNaN(new Date(iso).getTime());
}

/** Practice is untimed, so its typed start date means nothing to show. */
function StartsText({ c }: { c: Contest }) {
  if (c.is_practice) return <Text type="supporting">Always open</Text>;
  if (!validDate(c.starts_at)) return <Text type="supporting">Not set</Text>;
  return (
    <VStack gap={0.5}>
      <Text hasTabularNumbers>{formatWhen(c.starts_at)}</Text>
      <Text type="supporting">{relativeWhen(c.starts_at)}</Text>
    </VStack>
  );
}

function problemCount(n: number): string {
  return `${n} ${n === 1 ? "problem" : "problems"}`;
}

export function ContestsCard({
  contests,
  error,
  loading,
  now,
  onRetry,
}: {
  contests: Contest[] | null;
  error: string;
  loading: boolean;
  now: number;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<ContestFilter>("all");
  const [measureRef, widthRem] = useWidthRem<HTMLDivElement>();
  const layout = layoutFor(widthRem);

  const ordered = useMemo(() => orderContests(contests ?? []), [contests]);
  const filtered = useMemo(
    () => filterContests(ordered, filter),
    [ordered, filter],
  );
  const visible = filtered.slice(0, CAP);

  const columns = useMemo<TableColumn<Contest>[]>(() => {
    const title: TableColumn<Contest> = {
      key: "title",
      header: "Contest",
      width: col(MIN_REM.title),
      renderCell: (c) => (
        <VStack gap={0.5} style={{ minWidth: 0 }}>
          <Link href={`/org/contests/${c.uid}`} color="primary" isStandalone>
            {c.title}
          </Link>
          {layout === "narrow" && <StartsText c={c} />}
          {layout === "wide" ? (
            c.is_practice && <Text type="supporting">Practice</Text>
          ) : (
            <HStack gap={1} align="center" wrap="wrap">
              <Text type="supporting">
                {[c.is_practice ? "Practice" : null, problemCount(c.problems.length)]
                  .filter(Boolean)
                  .join(" · ")}
                {c.invite_code ? " · Code " : ""}
              </Text>
              {c.invite_code && <Text type="code">{c.invite_code}</Text>}
            </HStack>
          )}
        </VStack>
      ),
    };
    const status: TableColumn<Contest> = {
      key: "status",
      header: "Status",
      width: col(MIN_REM.status),
      renderCell: (c) => {
        // Practice is untimed: the backend says "running", the page says "Open", calmly.
        const s =
          c.status === "running" && c.is_practice
            ? { label: "Open", color: "default" as const }
            : statusOf(c.status);
        return <Token label={s.label} color={s.color} size="sm" />;
      },
    };
    const starts: TableColumn<Contest> = {
      key: "starts_at",
      header: "Starts",
      width: col(MIN_REM.starts),
      renderCell: (c) => <StartsText c={c} />,
    };
    const problems: TableColumn<Contest> = {
      key: "problems",
      header: "Problems",
      width: col(MIN_REM.problems),
      align: "end",
      renderCell: (c) => <Text hasTabularNumbers>{c.problems.length}</Text>,
    };
    const invite: TableColumn<Contest> = {
      key: "invite_code",
      header: "Invite code",
      width: col(MIN_REM.invite),
      renderCell: (c) =>
        c.invite_code ? <Text type="code">{c.invite_code}</Text> : null,
    };
    if (layout === "narrow") return [title, status];
    if (layout === "medium") return [title, status, starts];
    return [title, status, starts, problems, invite];
    // `now` re-renders the relative start times on each clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, now]);

  // The title cell holds the real link (keyboard and screen readers use it);
  // this makes the rest of the row a pointer shortcut to the same place.
  const plugins = useMemo<Record<string, TablePlugin<Contest>>>(
    () => ({
      rowLink: {
        transformBodyRow: (props, item) => ({
          ...props,
          htmlProps: {
            ...props.htmlProps,
            style: { ...props.htmlProps.style, cursor: "pointer" },
            onClick: (e) => {
              if ((e.target as HTMLElement).closest("a, button")) return;
              router.push(`/org/contests/${item.uid}`);
            },
          },
        }),
      },
    }),
    [router],
  );

  const emptyText = FILTERS.find((f) => f.value === filter)?.empty ?? "";

  return (
    <Card padding={4} aria-labelledby="dash-contests-heading">
      <VStack gap={4}>
        <HStack gap={3} justify="between" align="center" wrap="wrap">
          <Heading level={4} accessibilityLevel={2} id="dash-contests-heading">
            Contests
          </Heading>
          {/* Room around the control so its focus ring is never clipped. */}
          <HStack
            style={{
              maxWidth: "100%",
              overflowX: "auto",
              padding: "var(--spacing-1)",
              margin: "calc(var(--spacing-1) * -1)",
            }}
          >
            <SegmentedControl
              label="Show contests"
              value={filter}
              onChange={(v) => setFilter(v as ContestFilter)}
              size="sm"
            >
              {FILTERS.map((f) => (
                <SegmentedControlItem
                  key={f.value}
                  value={f.value}
                  label={f.label}
                />
              ))}
            </SegmentedControl>
          </HStack>
        </HStack>

        {error && (
          <Banner
            status="error"
            title="Contests did not load"
            description={contests ? "Showing the last list we had." : error}
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

        <style>{SKELETON_CSS}</style>
        <div ref={measureRef} data-dash-contests="">
        {contests === null ? (
          loading ? (
            // About the height of a full table, so nothing below jumps on load.
            <VStack gap={0} aria-hidden="true">
              <div style={{ height: "var(--spacing-10)" }} />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} data-dash-skeleton-row="">
                <HStack gap={4} align="center" style={{ height: "100%" }}>
                  <Skeleton
                    width="34%"
                    height="var(--spacing-4)"
                    radius={1}
                    index={i}
                  />
                  <Skeleton
                    width="12%"
                    height="var(--spacing-4)"
                    radius={1}
                    index={i}
                  />
                  <Skeleton
                    width="28%"
                    height="var(--spacing-4)"
                    radius={1}
                    index={i}
                  />
                  <Skeleton
                    width="10%"
                    height="var(--spacing-4)"
                    radius={1}
                    index={i}
                  />
                </HStack>
                </div>
              ))}
            </VStack>
          ) : null
        ) : (
          <Table<Contest>
            aria-label="Contests"
            data={visible}
            columns={columns}
            idKey="uid"
            density="balanced"
            verticalAlign="middle"
            hasHover
            plugins={plugins}
            emptyState={
              <VStack paddingBlock={6} align="center">
                <Text type="supporting">{emptyText}</Text>
              </VStack>
            }
          />
        )}
        </div>

        {contests !== null && (
          <HStack gap={3} justify="between" align="center" wrap="wrap">
            <Text type="supporting" role="status">
              {filtered.length > CAP
                ? `Showing ${CAP} of ${filtered.length}`
                : `${filtered.length} ${filtered.length === 1 ? "contest" : "contests"}`}
            </Text>
            <Link
              href="/org/contests"
              color="primary"
              hasUnderline
              isStandalone
            >
              View all contests
            </Link>
          </HStack>
        )}
      </VStack>
    </Card>
  );
}
