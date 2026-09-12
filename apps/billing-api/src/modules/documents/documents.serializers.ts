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
  const document =
    object === 'invoice'
      ? (() => {
          const invoice = { ...data }
          Reflect.deleteProperty(invoice, 'allocations')
          return invoice
        })()
      : data

  return {
    object,
    ...document,
    customer: nested(data.customer, 'customer'),
    ...(Array.isArray(data.lines)
      ? { lines: data.lines.map((line) => nested(line, singular)) }
      : {}),
    ...(object === 'invoice' && Array.isArray(data.allocations)
      ? {
          paymentAllocations: data.allocations.map((allocation) => {
            const paymentAllocation = allocation as Record<string, unknown>
            return {
              object: 'payment_allocation',
              ...paymentAllocation,
              payment: nested(paymentAllocation.payment, 'payment'),
            }
          }),
        }
      : {}),
    ...(object === 'invoice' && Array.isArray(data.creditNoteAllocations)
      ? {
          creditNoteAllocations: data.creditNoteAllocations.map(
            (allocation) => {
              const creditNoteAllocation = allocation as Record<string, unknown>
              return {
                object: 'credit_note_allocation',
                ...creditNoteAllocation,
                creditNote: nested(
                  creditNoteAllocation.creditNote,
                  'credit_note'
                ),
              }
            }
          ),
        }
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
