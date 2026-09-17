import type { CalendarEntry, CalendarEntryKind } from '@876/projects/contracts'

import { startOfDayUtc } from './calendar-range'
import { DAY_SECONDS } from '@/types/calendar'

export const CALENDAR_KIND_LABELS: Record<CalendarEntryKind, string> = {
  project: 'Project',
  phase: 'Phase',
  'work-item': 'Work item',
  event: 'Event',
  meeting: 'Meeting',
}

export const CALENDAR_KIND_STYLES: Record<
  CalendarEntryKind,
  { chip: string; dot: string }
> = {
  project: {
    chip: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  phase: {
    chip: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    dot: 'bg-cyan-500',
  },
  'work-item': {
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  event: {
    chip: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  meeting: {
    chip: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
  },
}

export const CALENDAR_LEGEND: readonly CalendarEntryKind[] = [
  'project',
  'phase',
  'work-item',
  'event',
  'meeting',
]

/** A work item is the only kind whose record key is not its own id. */
export function calendarEntryHref(entry: CalendarEntry): string {
  switch (entry.kind) {
    case 'project':
      return `/projects/${encodeURIComponent(entry.id)}`
    case 'phase':
      return `/phases/${encodeURIComponent(entry.id)}`
    case 'work-item':
      return `/issues/${encodeURIComponent(entry.issueIdentifier ?? entry.id)}`
    case 'event':
    case 'meeting':
      return `/calendar/events/${encodeURIComponent(entry.id)}`
  }
}

/**
 * Every day the entry covers. A multi-day entry (a project, phase or event with
 * an end) repeats in each day it spans so the grid never drops the tail. The
 * cap keeps a data error — an end decades away — from filling the grid.
 */
export function calendarEntryDays(
  entry: CalendarEntry,
  limitDays = 62
): number[] {
  const start = startOfDayUtc(entry.occurrenceStart)
  const end =
    entry.occurrenceEnd === null
      ? start
      : startOfDayUtc(Math.max(entry.occurrenceEnd, entry.occurrenceStart))

  const days: number[] = []
  for (
    let day = start;
    day <= end && days.length < limitDays;
    day += DAY_SECONDS
  )
    days.push(day)
  return days
}

/** All-day entries first, then by start, so a day column reads top-down. */
export function sortCalendarEntries<T extends CalendarEntry>(
  entries: readonly T[]
): T[] {
  return [...entries].sort((left, right) => {
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1
    if (left.occurrenceStart !== right.occurrenceStart)
      return left.occurrenceStart - right.occurrenceStart
    return (
      left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    )
  })
}

export function calendarEntriesByDay(
  entries: readonly CalendarEntry[],
  days: readonly number[]
): Map<number, CalendarEntry[]> {
  const byDay = new Map<number, CalendarEntry[]>(days.map((day) => [day, []]))

  for (const entry of sortCalendarEntries(entries)) {
    for (const day of calendarEntryDays(entry)) {
      const bucket = byDay.get(day)
      if (bucket) bucket.push(entry)
    }
  }

  return byDay
}
