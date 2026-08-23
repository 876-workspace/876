import { Prisma } from '@/db'
function convert(value: unknown): unknown {
  if (typeof value === 'bigint' || value instanceof Prisma.Decimal)
    return value.toString()
  if (Array.isArray(value)) return value.map(convert)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, convert(item)])
    )
  return value
}
export function serializePaymentIntent(row: unknown) {
  return {
    object: 'payment_intent' as const,
    ...(convert(row) as Record<string, unknown>),
  }
}
