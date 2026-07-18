import type { IntervalUnit } from '@/lib/db'

/** Adds one Billing cadence to a Unix-seconds timestamp in UTC. */
export function addInterval(
  startsAt: number,
  unit: IntervalUnit,
  count: number
): number {
  const date = new Date(startsAt * 1000)

  if (unit === 'DAY') date.setUTCDate(date.getUTCDate() + count)
  if (unit === 'WEEK') date.setUTCDate(date.getUTCDate() + count * 7)
  if (unit === 'MONTH') return addCalendarMonths(date, count)
  if (unit === 'YEAR') return addCalendarMonths(date, count * 12)

  return Math.floor(date.getTime() / 1000)
}

/** Selects the next tenant-approved monthly billing date in UTC. */
export function resolveCalendarBillingAnchor(
  startsAt: number,
  days: number[],
  months: number[]
): number {
  if (days.length === 0) return startsAt

  const start = new Date(startsAt * 1000)
  const allowedDays = [...new Set(days)].sort((a, b) => a - b)
  const allowedMonths = new Set(months)
  for (let monthOffset = 0; monthOffset <= 24; monthOffset += 1) {
    const monthStart = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + monthOffset,
        1,
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds()
      )
    )
    const month = monthStart.getUTCMonth() + 1
    if (allowedMonths.size > 0 && !allowedMonths.has(month)) continue
    const lastDay = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
    ).getUTCDate()
    for (const configuredDay of allowedDays) {
      const candidate = new Date(monthStart.getTime())
      candidate.setUTCDate(Math.min(configuredDay, lastDay))
      const timestamp = Math.floor(candidate.getTime() / 1000)
      if (timestamp >= startsAt) return timestamp
    }
  }

  return startsAt
}

function addCalendarMonths(date: Date, count: number): number {
  const day = date.getUTCDate()
  const target = new Date(date.getTime())
  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + count)
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))

  return Math.floor(target.getTime() / 1000)
}
