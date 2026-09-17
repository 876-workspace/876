import {
  CALENDAR_VIEWS,
  DAY_SECONDS,
  type CalendarNavDirection,
  type CalendarView,
  type CalendarWindow,
  type ResolvedCalendarWindow,
} from '@/types/calendar'

const WEEK_LENGTH_DAYS = 7
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const CALENDAR_WEEKDAY_LABELS: readonly string[] = WEEKDAY_LABELS

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const SHORT_DATE_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** Unknown or absent `view` values fall back to the default month grid. */
export function parseCalendarView(value: string | undefined): CalendarView {
  return CALENDAR_VIEWS.includes(value as CalendarView)
    ? (value as CalendarView)
    : 'month'
}

export function parseCalendarTimestamp(
  value: string | undefined
): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function startOfDayUtc(timestamp: number): number {
  return Math.floor(timestamp / DAY_SECONDS) * DAY_SECONDS
}

/** Monday-first week start, the layout the month grid renders. */
export function startOfWeekUtc(timestamp: number): number {
  const day = startOfDayUtc(timestamp)
  // 1970-01-01 was a Thursday, so +3 shifts Monday to weekday zero.
  const weekday = (Math.floor(day / DAY_SECONDS) + 3) % WEEK_LENGTH_DAYS
  return day - weekday * DAY_SECONDS
}

export function startOfMonthUtc(timestamp: number): number {
  const date = new Date(timestamp * 1000)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000
}

export function addDaysUtc(timestamp: number, days: number): number {
  return timestamp + days * DAY_SECONDS
}

export function addMonthsUtc(timestamp: number, months: number): number {
  const date = new Date(timestamp * 1000)
  return (
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate()
    ) / 1000
  )
}

/**
 * Resolves the window a view queries.
 *
 * The window is always calendar-aligned: a week starts on Monday, a month grid
 * covers whole weeks so the leading and trailing days of the neighbouring
 * months appear, and a list covers the anchor month exactly. `anchor` is the
 * view's canonical start (week start, or first of month) and is what labels and
 * navigation step from. An explicit `to` from the URL wins, so a shared link
 * renders the period it was copied from; a `to` at or before `from` is ignored.
 */
export function resolveCalendarWindow(input: {
  view: CalendarView
  from?: number | null
  to?: number | null
  now?: number
}): ResolvedCalendarWindow {
  const now = input.now ?? Math.floor(Date.now() / 1000)
  const anchorSource = input.from ?? now

  const base = ((): ResolvedCalendarWindow => {
    if (input.view === 'week') {
      const from = startOfWeekUtc(anchorSource)
      return {
        from,
        to: addDaysUtc(from, WEEK_LENGTH_DAYS) - 1,
        anchor: from,
      }
    }

    const monthStart = startOfMonthUtc(anchorSource)
    if (input.view === 'list')
      return {
        from: monthStart,
        to: addMonthsUtc(monthStart, 1) - 1,
        anchor: monthStart,
      }

    const gridStart = startOfWeekUtc(monthStart)
    const gridEnd = startOfWeekUtc(addMonthsUtc(monthStart, 1) - 1)
    return {
      from: gridStart,
      to: addDaysUtc(gridEnd, WEEK_LENGTH_DAYS) - 1,
      anchor: monthStart,
    }
  })()

  if (input.to && input.to > base.from) return { ...base, to: input.to }

  return base
}

/** Every day-start timestamp the window covers, in order. */
export function calendarDays(window: CalendarWindow): number[] {
  const days: number[] = []
  for (
    let day = startOfDayUtc(window.from);
    day <= window.to;
    day += DAY_SECONDS
  )
    days.push(day)
  return days
}

/**
 * One href builder for the view switch and for period navigation, so a link
 * always carries the active project filter and the anchor the user came from.
 * `today` drops `from` and lets the server resolve the current period.
 */
export function calendarHref(input: {
  view: CalendarView
  from?: number | null
  to?: number | null
  project?: string | null
}): string {
  const search = new URLSearchParams()
  search.set('view', input.view)
  if (input.from) search.set('from', String(input.from))
  if (input.from && input.to) search.set('to', String(input.to))
  if (input.project) search.set('project', input.project)
  return `/calendar?${search.toString()}`
}

export function calendarNavHref(input: {
  view: CalendarView
  anchor: number
  project?: string | null
  direction: CalendarNavDirection
}): string {
  if (input.direction === 'today')
    return calendarHref({ view: input.view, project: input.project })

  const step = input.direction === 'next' ? 1 : -1
  const from =
    input.view === 'week'
      ? addDaysUtc(input.anchor, step * WEEK_LENGTH_DAYS)
      : addMonthsUtc(startOfMonthUtc(input.anchor), step)
  const target = resolveCalendarWindow({ view: input.view, from })

  // The anchor, not the window start: a month grid begins in the previous
  // month, and re-resolving from there would step the label back a month.
  return calendarHref({
    view: input.view,
    from: target.anchor,
    to: target.to,
    project: input.project,
  })
}

export function calendarWindowLabel(
  view: CalendarView,
  window: ResolvedCalendarWindow
): string {
  if (view === 'week')
    return `${SHORT_DATE_LABEL.format(window.anchor * 1000)} – ${SHORT_DATE_LABEL.format(window.to * 1000)}, ${yearOf(window.to)}`

  return MONTH_LABEL.format(window.anchor * 1000)
}

export function calendarDayNumber(day: number): number {
  return new Date(day * 1000).getUTCDate()
}

export function calendarDayLabel(day: number): string {
  return SHORT_DATE_LABEL.format(day * 1000)
}

export function calendarDayIsToday(day: number, now: number): boolean {
  return startOfDayUtc(now) === startOfDayUtc(day)
}

export function yearOf(timestamp: number): number {
  return new Date(timestamp * 1000).getUTCFullYear()
}

/**
 * The day the calendar should mark as today. Resolved once per request on the
 * server and handed down, so a re-render never shifts the highlight.
 */
export function calendarTodayUtc(): number {
  return startOfDayUtc(Math.floor(Date.now() / 1000))
}
