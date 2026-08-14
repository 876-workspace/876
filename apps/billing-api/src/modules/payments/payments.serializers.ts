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
function object(value: unknown, discriminator: string): unknown {
  if (!value || typeof value !== 'object') return value
  return { object: discriminator, ...(json(value) as Record<string, unknown>) }
}
export function serializePaymentMode(row: unknown) {
  return object(row, 'payment_mode')
}
export function serializePayment(row: unknown) {
  const data = json(row) as Record<string, unknown>
  const allocations = Array.isArray(data.invoiceAllocations)
    ? data.invoiceAllocations.map((entry) => {
        const allocation = entry as Record<string, unknown>
        return {
          object: 'payment_allocation',
          ...allocation,
          invoice: object(allocation.invoice, 'invoice'),
        }
      })
    : []
  return {
    object: 'payment',
    ...data,
    source: data.sourceAppId
      ? {
          appId: data.sourceAppId,
          externalReference: data.sourceExternalReference ?? null,
        }
      : null,
    customer: object(data.customer, 'customer'),
    paymentMode: object(data.paymentMode, 'payment_mode'),
    depositAccount: object(data.depositAccount, 'bank_account'),
    invoiceAllocations: allocations,
    ...(data.bankTransaction === undefined
      ? {}
      : { bankTransaction: object(data.bankTransaction, 'bank_transaction') }),
  }
}
export function serializeRefund(row: unknown) {
  return object(row, 'refund')
}
export function paymentList(
  objectName: string,
  rows: unknown[],
  url: string,
  serializer: (row: unknown) => unknown
) {
  return {
    object: 'list' as const,
    data: rows.map(serializer),
    has_more: false,
    total_count: rows.length,
    url,
  }
}
