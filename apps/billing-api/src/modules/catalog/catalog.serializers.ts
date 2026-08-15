import { Prisma } from '@/db'

function jsonValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Prisma.Decimal) return value.toString()
  if (Array.isArray(value)) return value.map(jsonValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonValue(item)])
    )
  }
  return value
}

export function serializeCatalog(object: string, row: unknown) {
  return { object, ...(jsonValue(row) as Record<string, unknown>) }
}

export function catalogList(object: string, rows: unknown[], url: string) {
  return {
    object: 'list' as const,
    data: rows.map((row) => serializeCatalog(object, row)),
    has_more: false,
    total_count: rows.length,
    url,
  }
}
