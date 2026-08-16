import { Prisma } from '@/db'
function json(value: unknown): unknown {
  if (typeof value === 'bigint' || value instanceof Prisma.Decimal)
    return value.toString()
  if (Array.isArray(value)) return value.map(json)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, json(item)])
    )
  return value
}
function nested(value: unknown, object: string) {
  return value && typeof value === 'object'
    ? { object, ...(json(value) as Record<string, unknown>) }
    : value
}
export function serializeDocument(object: string, row: unknown) {
  const data = json(row) as Record<string, unknown>
  const singular =
    object === 'credit_note' ? 'credit_note_line' : `${object}_line`
  return {
    object,
    ...data,
    customer: nested(data.customer, 'customer'),
    ...(Array.isArray(data.lines)
      ? { lines: data.lines.map((line) => nested(line, singular)) }
      : {}),
  }
}
export function documentList(object: string, rows: unknown[], url: string) {
  return {
    object: 'list' as const,
    data: rows.map((row) => serializeDocument(object, row)),
    has_more: false,
    total_count: rows.length,
    url,
  }
}
