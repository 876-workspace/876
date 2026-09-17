import type { CalendarEntry, Project } from '@876/projects/contracts'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { NativeSelect } from '@876/ui/native-select'
import { Skeleton } from '@876/ui/skeleton'
import Link from 'next/link'

import {
  CALENDAR_KIND_LABELS,
  CALENDAR_KIND_STYLES,
  CALENDAR_LEGEND,
  calendarEntriesByDay,
  calendarEntryHref,
  sortCalendarEntries,
} from '@/features/projects/calendar-entries'
import {
  CALENDAR_WEEKDAY_LABELS,
  calendarDayIsToday,
  calendarDayLabel,
  calendarDayNumber,
  calendarDays,
  calendarHref,
} from '@/features/projects/calendar-range'
import type { CalendarView, ResolvedCalendarWindow } from '@/types/calendar'
import { projects } from '@/lib/services/projects'

const WEEK_LENGTH = 7

function timeLabel(entry: CalendarEntry): string | null {
  if (entry.allDay) return null
  return new Date(entry.occurrenceStart * 1000).toISOString().slice(11, 16)
}

function weeksOf(days: number[]): number[][] {
  const weeks: number[][] = []
  for (let index = 0; index < days.length; index += WEEK_LENGTH)
    weeks.push(days.slice(index, index + WEEK_LENGTH))
  return weeks
}

/** Colours are the only key a reader gets for free, so the key is always shown. */
export function CalendarLegend() {
  return (
    <ul
      aria-label="Calendar entry kinds"
      className="flex flex-wrap items-center gap-3"
    >
      {CALENDAR_LEGEND.map((kind) => (
        <li
          key={kind}
          className="text-muted-foreground flex items-center gap-1.5 text-xs"
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${CALENDAR_KIND_STYLES[kind].dot}`}
          />
          {CALENDAR_KIND_LABELS[kind]}
        </li>
      ))}
    </ul>
  )
}

/** Neutral filler: the toolbar, view switch and label above it stay put. */
export function CalendarGridSkeleton() {
  return (
    <div className="876-card grid grid-cols-7 gap-2 p-4">
      {Array.from({ length: 35 }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-md" />
      ))}
    </div>
  )
}

function EntryLink({
  entry,
  projectNames,
  showProject = false,
}: {
  entry: CalendarEntry
  projectNames?: ReadonlyMap<string, string>
  showProject?: boolean
}) {
  const time = timeLabel(entry)
  const style = CALENDAR_KIND_STYLES[entry.kind]

  return (
    <Link
      href={calendarEntryHref(entry)}
      className={`block truncate rounded-md border px-1.5 py-0.5 text-xs ${style.chip}`}
      title={`${CALENDAR_KIND_LABELS[entry.kind]}: ${entry.title}`}
    >
      {time ? (
        <span className="mr-1 font-medium tabular-nums">{time}</span>
      ) : null}
      {entry.title}
      {showProject && projectNames?.get(entry.projectId) ? (
        <span className="text-muted-foreground ml-1">
          · {projectNames.get(entry.projectId)}
        </span>
      ) : null}
    </Link>
  )
}

function DayGrid({
  entries,
  days,
  today,
  weekHeight,
}: {
  entries: readonly CalendarEntry[]
  days: number[]
  today: number
  weekHeight: string
}) {
  const byDay = calendarEntriesByDay(entries, days)

  return (
    <div className="876-card overflow-hidden">
      <div className="text-muted-foreground grid grid-cols-7 border-b text-xs font-medium">
        {CALENDAR_WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-3 py-2">
            {label}
          </div>
        ))}
      </div>
      {weeksOf(days).map((week) => (
        <div
          key={week[0]}
          className="border-b last:border-b-0 md:grid md:grid-cols-7"
        >
          {week.map((day) => (
            <div
              key={day}
              className={`border-b p-2 md:border-r md:border-b-0 md:last:border-r-0 ${weekHeight}`}
            >
              <p
                className={`text-xs font-medium ${
                  calendarDayIsToday(day, today)
                    ? 'bg-info text-info-foreground inline-flex size-5 items-center justify-center rounded-full'
                    : 'text-muted-foreground'
                }`}
              >
                {calendarDayNumber(day)}
              </p>
              <ul className="mt-1 space-y-1">
                {(byDay.get(day) ?? []).map((entry) => (
                  <li key={`${entry.kind}:${entry.id}`}>
                    <EntryLink entry={entry} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function CalendarListView({
  entries,
  days,
  projectNames,
}: {
  entries: readonly CalendarEntry[]
  days: number[]
  projectNames: ReadonlyMap<string, string>
}) {
  const byDay = calendarEntriesByDay(entries, days)
  const populated = days.filter((day) => (byDay.get(day) ?? []).length > 0)

  if (populated.length === 0)
    return <p className="text-muted-foreground text-sm">Nothing scheduled.</p>

  return (
    <div className="space-y-4">
      {populated.map((day) => (
        <section key={day} className="876-card space-y-2 p-4 sm:p-5">
          <h3 className="text-sm font-semibold">{calendarDayLabel(day)}</h3>
          <ul className="space-y-1">
            {(byDay.get(day) ?? []).map((entry) => (
              <li key={`${entry.kind}:${entry.id}`}>
                <EntryLink
                  entry={entry}
                  projectNames={projectNames}
                  showProject
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/**
 * The calendar itself: entries of every kind that already carries a date, plus
 * events this organization owns. `from`/`to` were resolved on the server before
 * this component was reached, so the window never depends on the browser clock.
 */
export async function CalendarData({
  orgId,
  view,
  window,
  project,
  today,
}: {
  orgId: string
  view: CalendarView
  window: ResolvedCalendarWindow
  project: string | null
  /** Day-start timestamp the page resolved, so the grid marks one stable day. */
  today: number
}) {
  const [calendarResult, projectsResult] = await Promise.all([
    projects.calendar.retrieve(orgId, {
      from: window.from,
      to: window.to,
      ...(project ? { projectId: project } : {}),
    }),
    projects.projects.list(orgId, { limit: 100 }),
  ])

  const projectList = projectsResult.data?.data ?? []
  const projectNames = new Map(
    projectList.map((entry: Project) => [entry.id, entry.name])
  )
  const entries = sortCalendarEntries(calendarResult.data?.entries ?? [])
  const days = calendarDays(window)
  const loadError = calendarResult.error ?? projectsResult.error

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some calendar entries could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}

      <form action="/calendar" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="from" value={String(window.anchor)} />
        <input type="hidden" name="to" value={String(window.to)} />
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground block text-xs font-medium">
            Project
          </span>
          <NativeSelect
            name="project"
            defaultValue={project ?? ''}
            className="min-w-44"
          >
            <option value="">All projects</option>
            {projectList.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
        {project ? (
          <Link
            href={calendarHref({
              view,
              from: window.anchor,
              to: window.to,
            })}
            className="text-muted-foreground text-sm hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {view === 'list' ? (
        <CalendarListView
          entries={entries}
          days={days}
          projectNames={projectNames}
        />
      ) : (
        <DayGrid
          entries={entries}
          days={days}
          today={today}
          weekHeight={view === 'week' ? 'min-h-40' : 'min-h-24'}
        />
      )}
    </div>
  )
}
