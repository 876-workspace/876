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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function object(value: unknown, discriminator: string): unknown {
  if (!value || typeof value !== 'object') return value
  return { object: discriminator, ...(json(value) as Record<string, unknown>) }
}

/** Public payment-mode shape. Tenant identity stays in the request boundary. */
export function serializePaymentMode(row: unknown) {
  const data = record(json(row))
  return {
    object: 'payment_mode' as const,
    id: data.id,
    name: data.name,
    isDefault: data.isDefault,
    isActive: data.isActive,
    isSystem: data.isSystem,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

function serializePaymentAllocation(row: unknown) {
  const data = record(row)
  const invoice = record(data.invoice)
  return {
    object: 'payment_allocation' as const,
    id: data.id,
    amount: data.amount,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    invoice: {
      object: 'invoice' as const,
      id: invoice.id,
      number: invoice.number,
      totalAmount: invoice.totalAmount,
      amountDue: invoice.amountDue,
      status: invoice.status,
    },
  }
}

function serializeBankTransaction(row: unknown) {
  const data = record(row)
  return {
    object: 'bank_transaction' as const,
    id: data.id,
    accountId: data.accountId,
    paymentId: data.paymentId ?? null,
    type: data.type,
    amount: data.amount,
    date: data.date,
    description: data.description ?? null,
    status: data.status,
    reference: data.reference ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Public payment shape shared by tenant and integration reads.
 *
 * Do not spread the Prisma row here. Payment rows contain provider diagnostics,
 * risk/snapshot data, tenant IDs, relation IDs, and idempotency internals that
 * are not part of the public payment contract.
 */
export function serializePayment(row: unknown) {
  const data = record(json(row))
  const customer = record(data.customer)
  const depositAccount = record(data.depositAccount)
  const allocations = Array.isArray(data.invoiceAllocations)
    ? data.invoiceAllocations.map(serializePaymentAllocation)
    : []

  return {
    object: 'payment' as const,
    id: data.id,
    number: data.number,
    amount: data.amount,
    unappliedAmount: data.unappliedAmount,
    amountRefunded: data.amountRefunded ?? '0',
    status: data.status,
    providerConnectionId: data.providerConnectionId ?? null,
    providerPaymentId: data.providerPaymentId ?? null,
    bankCharges: data.bankCharges,
    currency: data.currency,
    paymentDate: data.paymentDate,
    referenceNumber: data.referenceNumber ?? null,
    notes: data.notes ?? null,
    customer: {
      object: 'customer' as const,
      id: customer.id,
      name: customer.name,
    },
    paymentMode: serializePaymentMode(data.paymentMode),
    depositAccount: {
      object: 'bank_account' as const,
      id: depositAccount.id,
      name: depositAccount.name,
      accountType: depositAccount.accountType,
      currency: depositAccount.currency,
    },
    invoiceAllocations: allocations,
    ...(data.bankTransaction === undefined
      ? {}
      : {
          bankTransaction:
            data.bankTransaction === null
              ? null
              : serializeBankTransaction(data.bankTransaction),
        }),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/** Adds product-app attribution only on the formal integration surface. */
export function serializeIntegrationPayment(row: unknown) {
  const data = record(json(row))
  return {
    ...serializePayment(row),
    source: data.sourceAppId
      ? {
          appId: data.sourceAppId,
          externalReference: data.sourceExternalReference ?? null,
        }
      : null,
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
