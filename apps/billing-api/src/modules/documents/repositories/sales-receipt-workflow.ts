import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import type { CommercialLineSnapshot } from '@/types/commercial-line'

export function runSalesReceiptTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(work, { isolationLevel: 'Serializable' })
}

export async function resolveSalesReceiptDefaults(
  tenantId: string,
  customerId: string,
  salespersonId?: string | null
) {
  const [customer, tenant, invoicePreference, documentPreference, salesperson] =
    await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, tenantId, status: 'ACTIVE' },
        include: {
          addresses: {
            where: { type: { in: ['billing', 'shipping'] } },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { defaultCurrency: true },
      }),
      prisma.invoicePreference.findUnique({ where: { tenantId } }),
      prisma.documentPreference.findUnique({
        where: {
          tenantId_documentType: { tenantId, documentType: 'SALES_RECEIPT' },
        },
      }),
      salespersonId
        ? prisma.salesperson.findFirst({
            where: { id: salespersonId, tenantId, isActive: true },
            select: { id: true, name: true },
          })
        : null,
    ])

  if (!customer || !tenant) return null

  const billingAddress =
    customer.addresses.find((address) => address.type === 'billing') ?? null
  const shippingAddress =
    customer.addresses.find((address) => address.type === 'shipping') ?? null

  return {
    customer,
    tenant,
    salesperson,
    taxBehavior:
      customer.taxBehaviorOverride ??
      invoicePreference?.defaultTaxBehavior ??
      ('EXCLUSIVE' as const),
    notes: documentPreference?.customerNote ?? null,
    terms: documentPreference?.termsAndConditions ?? null,
    billingAddressSnapshot: toAddressSnapshot(billingAddress),
    shippingAddressSnapshot: toAddressSnapshot(shippingAddress),
  }
}

export function findQuoteForSalesReceipt(tenantId: string, quoteId: string) {
  return prisma.quote.findFirst({
    where: { id: quoteId, tenantId },
    include: {
      customer: {
        include: {
          addresses: {
            where: { type: { in: ['billing', 'shipping'] } },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      lines: { orderBy: { createdAt: 'asc' } },
      convertedSalesReceipt: { select: { id: true } },
    },
  })
}

export function findSalesReceiptByIdempotency(
  tenantId: string,
  sourceAppId: string,
  sourceIdempotencyKey: string
) {
  return prisma.salesReceipt.findFirst({
    where: { tenantId, sourceAppId, sourceIdempotencyKey },
    select: { id: true, sourcePayloadHash: true },
  })
}

export async function createSalesReceiptRow(
  tx: Prisma.TransactionClient,
  params: {
    id: string
    tenantId: string
    customerId: string
    quoteId?: string | null
    paymentId: string
    salespersonId?: string | null
    salespersonName?: string | null
    priceListId?: string | null
    priceListName?: string | null
    number: string
    currency: string
    referenceNumber?: string | null
    taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
    customerName?: string | null
    customerEmail?: string | null
    billingAddressSnapshot?: Prisma.InputJsonValue | null
    shippingAddressSnapshot?: Prisma.InputJsonValue | null
    receiptAt: number
    subtotalAmount: bigint
    taxAmount: bigint
    discountAmount: bigint
    totalAmount: bigint
    notes?: string | null
    terms?: string | null
    sourceAppId?: string | null
    sourceExternalReference?: string | null
    sourceIdempotencyKey?: string | null
    sourcePayloadHash?: string | null
    lines: CommercialLineSnapshot[]
    now: number
  }
) {
  return tx.salesReceipt.create({
    data: {
      id: params.id,
      tenantId: params.tenantId,
      customerId: params.customerId,
      quoteId: params.quoteId ?? null,
      paymentId: params.paymentId,
      salespersonId: params.salespersonId ?? null,
      salespersonName: params.salespersonName ?? null,
      priceListId: params.priceListId ?? null,
      priceListName: params.priceListName ?? null,
      number: params.number,
      status: 'PAID',
      currency: params.currency,
      referenceNumber: params.referenceNumber ?? null,
      taxBehavior: params.taxBehavior,
      customerName: params.customerName ?? null,
      customerEmail: params.customerEmail ?? null,
      billingAddressSnapshot: params.billingAddressSnapshot ?? undefined,
      shippingAddressSnapshot: params.shippingAddressSnapshot ?? undefined,
      receiptAt: params.receiptAt,
      subtotalAmount: params.subtotalAmount,
      taxAmount: params.taxAmount,
      discountAmount: params.discountAmount,
      totalAmount: params.totalAmount,
      notes: params.notes ?? null,
      terms: params.terms ?? null,
      sourceAppId: params.sourceAppId ?? null,
      sourceExternalReference: params.sourceExternalReference ?? null,
      sourceIdempotencyKey: params.sourceIdempotencyKey ?? null,
      sourcePayloadHash: params.sourcePayloadHash ?? null,
      createdAt: params.now,
      updatedAt: params.now,
      lines: {
        create: params.lines.map((line, position) => ({
          id: `${params.id}_line_${position + 1}`,
          ...line,
          position,
          createdAt: params.now,
          updatedAt: params.now,
        })),
      },
    },
  })
}

export function findSalesReceiptForVoid(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salesReceiptId: string
) {
  return tx.salesReceipt.findFirst({
    where: { id: salesReceiptId, tenantId },
    include: {
      lines: true,
      payment: {
        include: {
          refunds: true,
          bankTransaction: true,
        },
      },
      creditNotes: { include: { refunds: true } },
    },
  })
}

export function markSalesReceiptVoid(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salesReceiptId: string,
  reason: string | null,
  now: number
) {
  return tx.salesReceipt.update({
    where: { tenantId_id: { tenantId, id: salesReceiptId } },
    data: { status: 'VOID', voidedAt: now, voidReason: reason, updatedAt: now },
  })
}

function toAddressSnapshot(
  address: {
    label: string | null
    attention: string | null
    line1: string | null
    line2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    countryCode: string | null
  } | null
) {
  if (!address) return null
  return {
    label: address.label,
    attention: address.attention,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
  }
}
