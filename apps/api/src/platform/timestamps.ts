/**
 * App-owned timestamps are Unix **seconds** everywhere — in the database, on
 * the wire, in the SDK contracts. Never milliseconds, never a Date, never an
 * ISO string. See CLAUDE.md → API Contracts.
 */
export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function isoToUnixSeconds(iso: string): number {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new Error(`Invalid ISO timestamp: ${iso}`)

  return Math.floor(ms / 1000)
}

/**
 * Prisma maps Postgres `BIGINT` to `bigint`. Every timestamp column in this
 * database is a Unix second count that fits in a double many times over, so the
 * conversion is lossless — but it has to happen at the serializer boundary or
 * `JSON.stringify` throws "Do not know how to serialize a BigInt".
 */
export function fromDbUnixSeconds(value: bigint): number {
  return Number(value)
}

export function nullableFromDbUnixSeconds(value: bigint | null): number | null {
  return value === null ? null : Number(value)
}

export function toDbUnixSeconds(value: number): bigint {
  return BigInt(value)
}

export function nullableToDbUnixSeconds(
  value: number | null | undefined
): bigint | null {
  return value === null || value === undefined ? null : BigInt(value)
}
