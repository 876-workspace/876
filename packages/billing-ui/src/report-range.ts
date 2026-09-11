/** Server-side report preset resolution. Pure and timezone-aware: preset
 * boundaries are computed in the tenant timezone (from report preferences),
 * never in the browser clock. Hosts resolve the range in the page and thread
 * plain `from`/`to` unix seconds into SDK calls. */

export type ReportPreset =
  | 'today'
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-year'
  | 'custom'

export const REPORT_PRESETS: readonly ReportPreset[] = [
  'today',
  'this-week',
  'this-month',
  'last-month',
  'this-quarter',
  'this-year',
  'custom',
] as const

export const REPORT_PRESET_LABELS: Record<ReportPreset, string> = {
  today: 'Today',
  'this-week': 'This week',
  'this-month': 'This month',
  'last-month': 'Last month',
  'this-quarter': 'This quarter',
  'this-year': 'This year',
  custom: 'Custom',
}

export type ReportGroupBy = 'day' | 'week' | 'month'

export interface ReportRange {
  from: number
  to: number
}

interface ZonedDate {
  year: number
  month: number
  day: number
}

function zonedDate(timeZone: string, unixSeconds: number): ZonedDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(unixSeconds * 1000))
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN)
  return { year: get('year'), month: get('month'), day: get('day') }
}

function zoneOffsetMs(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  )
  return asUtc - utcMs
}

/** Resolves a zoned local midnight to unix seconds (two-pass offset fixpoint). */
export function zonedMidnightToUnixSeconds(
  date: ZonedDate,
  timeZone: string
): number {
  const base = Date.UTC(date.year, date.month - 1, date.day)
  let guess = base - zoneOffsetMs(timeZone, base)
  guess = base - zoneOffsetMs(timeZone, guess)
  return Math.floor(guess / 1000)
}

/** Weekday of a calendar date (1 = Monday … 7 = Sunday), zone-independent. */
function weekdayMondayFirst(date: ZonedDate): number {
  const sundayFirst = new Date(
    Date.UTC(date.year, date.month - 1, date.day)
  ).getUTCDay()
  return sundayFirst === 0 ? 7 : sundayFirst
}

function shiftMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const total = (year * 12 + (month - 1) + delta) % 12
  const normalized = total < 0 ? total + 12 : total
  const years = Math.floor((year * 12 + (month - 1) + delta) / 12)
  return { year: years, month: normalized + 1 }
}

function addDays(date: ZonedDate, days: number): ZonedDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days)
  )
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

/** Resolves a preset to an exclusive-end [from, to) range in unix seconds. */
export function resolveReportPreset(
  preset: Exclude<ReportPreset, 'custom'>,
  timeZone: string,
  nowSeconds: number
): ReportRange {
  const today = zonedDate(timeZone, nowSeconds)
  let start: ZonedDate
  let end: ZonedDate

  switch (preset) {
    case 'today':
      start = today
      end = addDays(today, 1)
      break
    case 'this-week': {
      const monday = addDays(today, -(weekdayMondayFirst(today) - 1))
      start = monday
      end = addDays(monday, 7)
      break
    }
    case 'this-month':
      start = { ...today, day: 1 }
      end = { ...shiftMonths(today.year, today.month, 1), day: 1 }
      break
    case 'last-month': {
      const previous = shiftMonths(today.year, today.month, -1)
      start = { ...previous, day: 1 }
      end = { ...today, day: 1 }
      break
    }
    case 'this-quarter': {
      const quarterStartMonth = Math.floor((today.month - 1) / 3) * 3 + 1
      start = { year: today.year, month: quarterStartMonth, day: 1 }
      const next = shiftMonths(today.year, quarterStartMonth, 3)
      end = { ...next, day: 1 }
      break
    }
    case 'this-year':
      start = { year: today.year, month: 1, day: 1 }
      end = { year: today.year + 1, month: 1, day: 1 }
      break
  }

  return {
    from: zonedMidnightToUnixSeconds(start, timeZone),
    to: zonedMidnightToUnixSeconds(end, timeZone),
  }
}

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateInput(value: string): ZonedDate | null {
  const match = DATE_INPUT_PATTERN.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const roundTrip = new Date(Date.UTC(year, month - 1, day))
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() + 1 !== month ||
    roundTrip.getUTCDate() !== day
  )
    return null
  return { year, month, day }
}

export type CustomRangeResult =
  | { data: ReportRange; error: null }
  | { data: null; error: { code: string; message: string } }

/** Validates custom `YYYY-MM-DD` inputs into an exclusive-end range. */
export function resolveCustomRange(
  fromInput: string,
  toInput: string,
  timeZone: string
): CustomRangeResult {
  const invalid = (message: string): CustomRangeResult => ({
    data: null,
    error: { code: 'reports/invalid-range', message },
  })
  const fromDate = parseDateInput(fromInput)
  const toDate = parseDateInput(toInput)
  if (!fromDate || !toDate)
    return invalid('Enter the custom range as YYYY-MM-DD dates.')
  const from = zonedMidnightToUnixSeconds(fromDate, timeZone)
  const to = zonedMidnightToUnixSeconds(addDays(toDate, 1), timeZone)
  if (!(from < to)) return invalid('The range start must be before the range end.')
  return { data: { from, to }, error: null }
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Short axis label for a bucket start instant in the tenant timezone. */
export function formatBucketLabel(
  unixSeconds: number,
  groupBy: ReportGroupBy,
  timeZone: string
): string {
  const date = zonedDate(timeZone, unixSeconds)
  const month = MONTH_SHORT[date.month - 1]
  if (groupBy === 'month') return `${month} ’${String(date.year).slice(2)}`
  return `${month} ${date.day}`
}

const MAX_RANGE_DAYS = 400

/** Guards a resolved range against the reporting API limits. */
export function validateReportRange(range: ReportRange): boolean {
  if (!(range.from < range.to)) return false
  return range.to - range.from <= MAX_RANGE_DAYS * 86400
}
