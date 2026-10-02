"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { Calendar, type ISODateString } from "@astryxdesign/core/Calendar";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import type { Contest } from "@/lib/orgTypes";

/** Calendar days and agenda times both use the browser's local time zone. */
function localDateKey(date: Date): ISODateString {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` as ISODateString;
}

const STATUS_WORD: Record<string, string> = {
  running: "Live",
  scheduled: "Scheduled",
  draft: "Draft",
  ended: "Ended",
  archived: "Archived",
};

/**
 * Month view of when contests start. The Calendar has no marker API, so the
 * days with a contest get a small dot through a generated rule keyed on the
 * day button's `data-date`. The agenda list below is the accessible source
 * of the same information.
 */
export function ScheduleCard({ contests }: { contests: Contest[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ISODateString>(() =>
    localDateKey(new Date()),
  );
  const [focus, setFocus] = useState<ISODateString>(selected);

  const schedule = useMemo(
    () =>
      contests
        .flatMap((c) => {
          // Practice contests are untimed, whatever dates they carry.
          if (c.is_practice) return [];
          const startsAt = new Date(c.starts_at);
          if (Number.isNaN(startsAt.getTime())) return [];
          return [{ contest: c, startsAt, day: localDateKey(startsAt) }];
        })
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    [contests],
  );

  const markedDays = useMemo(
    () => [...new Set(schedule.map((e) => e.day))],
    [schedule],
  );
  const markerCss = markedDays.length
    ? `${markedDays
        .map((d) => `[data-dash-schedule] button[data-date="${d}"]::after`)
        .join(",\n")} {
  content: "";
  position: absolute;
  inset-block-end: var(--spacing-0-5);
  inset-inline-start: 50%;
  translate: -50% 0;
  width: var(--spacing-1);
  height: var(--spacing-1);
  border-radius: 50%;
  background: currentColor;
}`
    : "";

  const dayEvents = schedule.filter((e) => e.day === selected);
  const now = Date.now();
  const next = schedule.find((e) => e.startsAt.getTime() >= now);
  const selectedLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${selected}T12:00:00`));
  const timeFormat = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  function selectDay(day: ISODateString) {
    setSelected(day);
    setFocus(day);
  }

  return (
    <Card padding={4} aria-labelledby="dash-schedule-heading">
      <VStack gap={3}>
        <HStack gap={2} justify="between" align="center">
          <Heading level={4} accessibilityLevel={2} id="dash-schedule-heading">
            Schedule
          </Heading>
          <Button
            label="Today"
            variant="ghost"
            size="sm"
            onClick={() => selectDay(localDateKey(new Date()))}
          />
        </HStack>

        {markerCss && <style>{markerCss}</style>}
        <div data-dash-schedule="" style={{ overflowX: "auto", minWidth: 0 }}>
          <Calendar
            mode="single"
            value={selected}
            onChange={(v) => setSelected(v)}
            focusDate={focus}
            onFocusDateChange={setFocus}
            aria-label="Contest start dates"
            style={{ width: "100%", minWidth: 0, padding: 0 }}
          />
        </div>

        <VStack
          as="section"
          gap={1}
          aria-label="Contests on the selected day"
          aria-live="polite"
        >
          <Text weight="medium">Starting {selectedLabel}</Text>
          {dayEvents.length > 0 ? (
            <List density="compact" hasDividers>
              {dayEvents.map(({ contest, startsAt }) => (
                <ListItem
                  key={contest.uid}
                  style={{ paddingInline: 0, minWidth: 0 }}
                  onClick={() => router.push(`/org/contests/${contest.uid}`)}
                  label={contest.title}
                  description={`${timeFormat.format(startsAt)} · ${STATUS_WORD[contest.status] ?? contest.status}`}
                  startContent={<VisuallyHidden>Open contest: </VisuallyHidden>}
                  endContent={
                    <Icon icon="chevronRight" size="sm" color="secondary" />
                  }
                />
              ))}
            </List>
          ) : (
            <Text type="supporting">No contests start on this day.</Text>
          )}
          {next && next.day !== selected && (
            <Button
              label="Show next contest"
              variant="ghost"
              size="sm"
              onClick={() => selectDay(next.day)}
              style={{ alignSelf: "flex-start" }}
            />
          )}
        </VStack>

        <Text type="supporting">
          Dates and times are in your local time zone.
        </Text>
      </VStack>
    </Card>
  );
}
