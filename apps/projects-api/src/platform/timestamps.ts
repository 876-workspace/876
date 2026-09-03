export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function fromDbUnixSeconds(value: bigint | number): number {
  return Number(value)
}

export function nullableFromDbUnixSeconds(
  value: bigint | number | null | undefined
): number | null {
  return value === null || value === undefined ? null : Number(value)
}

export function toDbUnixSeconds(value: number): bigint {
  return BigInt(value)
}

export function nullableToDbUnixSeconds(
  value: number | null | undefined
): bigint | null {
  return value === null || value === undefined ? null : BigInt(value)
}
