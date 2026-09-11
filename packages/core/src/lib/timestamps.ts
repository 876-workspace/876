export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/** Advances a Unix-second timestamp on a calendar anchor without month-end drift. */
export function addInterval(
  startsAt: number,
  unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR',
  count: number
): number {
  if (!Number.isInteger(count) || count <= 0)
    throw new Error('Interval count must be positive.')
  if (unit === 'DAY') return startsAt + count * 86_400
  if (unit === 'WEEK') return startsAt + count * 7 * 86_400
  const source = new Date(startsAt * 1000)
  const months = unit === 'MONTH' ? count : count * 12
  const monthIndex = source.getUTCMonth() + months
  const year = source.getUTCFullYear() + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const day = Math.min(
    source.getUTCDate(),
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  )
  return Math.floor(
    Date.UTC(
      year,
      month,
      day,
      source.getUTCHours(),
      source.getUTCMinutes(),
      source.getUTCSeconds(),
      source.getUTCMilliseconds()
    ) / 1000
  )
}

export function toDbUnixSeconds(timestamp: number): bigint {
  return BigInt(timestamp)
}

export function fromDbUnixSeconds(timestamp: bigint): number {
  return Number(timestamp)
}

export function nullableFromDbUnixSeconds(
  timestamp: bigint | null
): number | null {
  return timestamp === null ? null : fromDbUnixSeconds(timestamp)
}

export function isoToUnixSeconds(timestamp: string): number {
  return Math.floor(new Date(timestamp).getTime() / 1000)
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}
