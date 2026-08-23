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
export function serializePaymentMethod(row: unknown) {
  const data = json(row) as Record<string, unknown>
  // Defence in depth: the query never selects the credential relation, and if
  // one is ever added, it must not reach a response.
  delete data.credential
  return { object: 'payment_method' as const, ...data }
}
