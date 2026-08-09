export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function fromDbUnixSeconds(value: number | bigint): number {
  return Number(value)
}

export function nullableFromDbUnixSeconds(
  value: number | bigint | null
): number | null {
  return value === null ? null : Number(value)
}

export function toDbUnixSeconds(value: number): number {
  return value
}
