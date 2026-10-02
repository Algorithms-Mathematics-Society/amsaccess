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

/** Rows shown before "View all contests" takes over. */
const CAP = 8;

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

export function ContestsCard({
  contests,
  error,
  loading,
  onRetry,
}: {
  contests: Contest[] | null;
  error: string;
  loading: boolean;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<ContestFilter>("all");

  const ordered = useMemo(() => orderContests(contests ?? []), [contests]);
  const filtered = useMemo(
    () => filterContests(ordered, filter),
    [ordered, filter],
  );
  const visible = filtered.slice(0, CAP);

  const columns = useMemo<TableColumn<Contest>[]>(
    () => [
      {
        key: "title",
        header: "Contest",
        width: proportional(2.8),
        renderCell: (c) => (
          <VStack gap={0.5} style={{ minWidth: 0 }}>
            <Link href={`/org/contests/${c.uid}`} color="primary" isStandalone>
              {c.title}
            </Link>
            {c.is_practice && <Text type="supporting">Practice</Text>}
          </VStack>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: proportional(1.4),
        renderCell: (c) => {
          // Practice is untimed: the backend says "running", the page says "Open", calmly.
          const s =
            c.status === "running" && c.is_practice
              ? { label: "Open", color: "default" as const }
              : statusOf(c.status);
          return <Token label={s.label} color={s.color} size="sm" />;
        },
      },
      {
        key: "starts_at",
        header: "Starts",
        width: proportional(2),
        renderCell: (c) =>
          validDate(c.starts_at) ? (
            <VStack gap={0.5}>
              <Text hasTabularNumbers>{formatWhen(c.starts_at)}</Text>
              <Text type="supporting">{relativeWhen(c.starts_at)}</Text>
            </VStack>
          ) : (
            <Text type="supporting">Not set</Text>
          ),
      },
      {
        key: "problems",
        header: "Problems",
        width: proportional(1.4),
        align: "end",
        renderCell: (c) => <Text hasTabularNumbers>{c.problems.length}</Text>,
      },
      {
        key: "invite_code",
        header: "Invite code",
        width: proportional(1.4),
        renderCell: (c) =>
          c.invite_code ? <Text type="code">{c.invite_code}</Text> : null,
      },
    ],
    [],
  );

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
<div style={{ maxWidth: "100%", overflowX: "auto" }}>
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
</div>
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

        {contests === null ? (
          loading ? (
            <VStack gap={3} aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <HStack key={i} gap={4} align="center">
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
