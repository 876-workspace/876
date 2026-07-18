export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000)
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
