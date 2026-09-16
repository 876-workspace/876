export const MAX_RECURRENCE_OCCURRENCES = 1000

const DAY_SECONDS = 86400

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type RecurrenceRule = {
  freq: RecurrenceFrequency
  interval: number
  /**
   * Weekdays an event repeats on, 0 (Sunday) through 6 (Saturday) in UTC.
   * Weekly only; null or empty means the weekday of `startsAt`.
   */
  byWeekday: number[] | null
  /** Inclusive upper bound on occurrence starts, Unix seconds. */
  until: number | null
  /** Maximum occurrences counting from the very first one, window or not. */
  count: number | null
  /** First occurrence start, Unix seconds. */
  startsAt: number
  /** Occurrence length in seconds; null marks a point in time. */
  durationSeconds: number | null
}

export type RecurrenceOccurrence = {
  start: number
  end: number | null
}

function normalizeInterval(interval: number): number {
  if (!Number.isFinite(interval)) return 1
  return Math.max(1, Math.floor(interval))
}

function normalizeWeekdays(
  byWeekday: number[] | null,
  startsAt: number
): number[] {
  const days = (byWeekday ?? [])
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b)
  const unique = [...new Set(days)]
  if (unique.length > 0) return unique
  return [new Date(startsAt * 1000).getUTCDay()]
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function startOfUtcDay(unixSeconds: number): number {
  return Math.floor(unixSeconds / DAY_SECONDS) * DAY_SECONDS
}

/**
 * Yields candidate occurrence starts in ascending order. Callers stop
 * iterating once the cap, `count`, `until`, or the window end is passed —
 * every frequency below is monotonically non-decreasing, so stopping is safe.
 */
function* candidateStarts(rule: RecurrenceRule): Generator<number> {
  const interval = normalizeInterval(rule.interval)
  if (rule.freq === 'daily') {
    let start = rule.startsAt
    const step = interval * DAY_SECONDS
    while (true) {
      yield start
      start += step
    }
  } else if (rule.freq === 'weekly') {
    const weekdays = normalizeWeekdays(rule.byWeekday, rule.startsAt)
    const startDay = startOfUtcDay(rule.startsAt)
    const timeOfDay = rule.startsAt - startDay
    const startWeekday = new Date(rule.startsAt * 1000).getUTCDay()
    let week = 0
    while (true) {
      // Candidates are sorted inside the week: a set like [Monday] with a
      // mid-week first start would otherwise yield next Monday before this
      // week's remaining days, breaking the ascending order callers rely on.
      const starts = weekdays
        .map(
          (weekday) =>
            startDay +
            (week * interval * 7 + ((weekday - startWeekday + 7) % 7)) *
              DAY_SECONDS +
            timeOfDay
        )
        .filter((start) => start >= rule.startsAt)
        .sort((a, b) => a - b)
      for (const start of starts) yield start
      week += 1
    }
  } else {
    const first = new Date(rule.startsAt * 1000)
    const dayOfMonth = first.getUTCDate()
    const month = first.getUTCMonth()
    const year = first.getUTCFullYear()
    const hours = first.getUTCHours()
    const minutes = first.getUTCMinutes()
    const seconds = first.getUTCSeconds()
    const step = rule.freq === 'monthly' ? interval : interval * 12
    let stepIndex = 0
    while (true) {
      const totalMonths = month + stepIndex * step
      const targetYear = year + Math.floor(totalMonths / 12)
      const targetMonth = ((totalMonths % 12) + 12) % 12
      // Month-end handling: a monthly 31st (or yearly Feb 29th) in a month
      // too short to hold it is skipped, never clamped into a neighbouring
      // day. February simply has no occurrence that cycle, and the cadence
      // resumes the next month or year that fits the day-of-month.
      if (dayOfMonth <= daysInUtcMonth(targetYear, targetMonth)) {
        yield Math.floor(
          Date.UTC(
            targetYear,
            targetMonth,
            dayOfMonth,
            hours,
            minutes,
            seconds
          ) / 1000
        )
      }
      stepIndex += 1
    }
  }
}

/**
 * Expands a stored recurrence rule into occurrences overlapping
 * `[windowStart, windowEnd]` (both inclusive, Unix seconds).
 *
 * All maths stays in Unix seconds and UTC calendar fields, so daylight-saving
 * transitions never shift or duplicate an occurrence: a daily event fires
 * every 86,400 seconds even across a DST boundary, and weekly/monthly anchors
 * keep their UTC time-of-day.
 *
 * At most `MAX_RECURRENCE_OCCURRENCES` occurrences are produced; `count`
 * further limits the total counting from the first occurrence, and `until`
 * caps occurrence starts inclusively. Reads no database and no clock.
 */
export function expandOccurrences(
  rule: RecurrenceRule,
  windowStart: number,
  windowEnd: number
): RecurrenceOccurrence[] {
  const occurrences: RecurrenceOccurrence[] = []
  // Every frequency yields candidates >= startsAt by construction, so a
  // window ending before the first occurrence is always empty.
  if (windowEnd < rule.startsAt) return occurrences
  let produced = 0
  for (const start of candidateStarts(rule)) {
    if (start > windowEnd) break
    if (rule.until !== null && start > rule.until) break
    if (rule.count !== null && produced >= rule.count) break
    if (produced >= MAX_RECURRENCE_OCCURRENCES) break
    produced += 1
    const end =
      rule.durationSeconds === null ? null : start + rule.durationSeconds
    const effectiveEnd = end ?? start
    if (start <= windowEnd && effectiveEnd >= windowStart) {
      occurrences.push({ start, end })
    }
  }
  return occurrences
}
