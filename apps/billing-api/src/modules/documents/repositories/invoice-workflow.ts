import type { Prisma } from '@/db'
import { prisma } from '@/db/client'

export function runInvoiceTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(work, { isolationLevel: 'Serializable' })
}

export function findInvoiceForFinalize(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string
) {
  return tx.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      customer: { select: { salespersonId: true } },
      lines: { select: { itemId: true, variantId: true, quantity: true } },
    },
  })
}

export function findPaymentTerm(
  tx: Prisma.TransactionClient,
  tenantId: string,
  paymentTermId?: string | null
) {
  return paymentTermId
    ? tx.paymentTerm.findFirst({
        where: { id: paymentTermId, tenantId, isActive: true },
      })
    : tx.paymentTerm.findFirst({
        where: { tenantId, rule: 'DUE_ON_RECEIPT', isActive: true },
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      })
}

export function findSalesperson(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salespersonId?: string | null
) {
  return salespersonId
    ? tx.salesperson.findFirst({
        where: { id: salespersonId, tenantId, isActive: true },
      })
    : Promise.resolve(null)
}

export function markInvoiceFinalized(
  tx: Prisma.TransactionClient,
  params: {
    id: string
    status: 'OPEN' | 'PAID'
    issueAt: number
    dueAt: number
    finalizedAt: number
    paymentTermId: string | null
    paymentTermName: string | null
    salespersonId: string | null
    salespersonName: string | null
  }
) {
  return tx.invoice.update({
    where: { id: params.id },
    data: {
      status: params.status,
      issueAt: params.issueAt,
      dueAt: params.dueAt,
      finalizedAt: params.finalizedAt,
      paidAt: params.status === 'PAID' ? params.finalizedAt : null,
      paymentTermId: params.paymentTermId,
      paymentTermName: params.paymentTermName,
      salespersonId: params.salespersonId,
      salespersonName: params.salespersonName,
      updatedAt: params.finalizedAt,
    },
  })
}

export function findInvoiceForSend(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string
) {
  return tx.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    select: {
      id: true,
      status: true,
      customerId: true,
      number: true,
      currency: true,
      sentAt: true,
    },
  })
}

export function markInvoiceSent(
  tx: Prisma.TransactionClient,
  params: {
    id: string
    status: 'OPEN' | 'SENT' | 'PARTIALLY_PAID' | 'OVERDUE' | 'PAID'
    sentAt: number | null
    now: number
  }
) {
  return tx.invoice.update({
    where: { id: params.id },
    data: {
      status: params.status === 'OPEN' ? 'SENT' : params.status,
      sentAt: params.sentAt ?? params.now,
      updatedAt: params.now,
    },
  })
}

export function findInvoiceForVoid(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string
) {
  return tx.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      allocations: { where: { reversedAt: null } },
      creditNoteAllocations: { where: { reversedAt: null } },
    },
  })
}

function objectMetadata(metadata: unknown): Record<string, unknown> | undefined {
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : undefined
}

export function markInvoiceVoid(
  tx: Prisma.TransactionClient,
  params: {
    id: string
    now: number
    reason?: string | null
    metadata: unknown
  }
) {
  const existingMetadata = objectMetadata(params.metadata)
  const metadata = params.reason
    ? { ...existingMetadata, voidReason: params.reason }
    : existingMetadata

  return tx.invoice.update({
    where: { id: params.id },
    data: {
      status: 'VOID',
      amountDue: 0n,
      voidedAt: params.now,
      metadata,
      updatedAt: params.now,
    },
  })
}

export function findInvoiceForWriteOff(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string
) {
  return tx.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    select: {
      id: true,
      status: true,
      customerId: true,
      subscriptionId: true,
      number: true,
      currency: true,
      amountDue: true,
      metadata: true,
    },
  })
}

export function markInvoiceWrittenOff(
  tx: Prisma.TransactionClient,
  params: {
    id: string
    amount: bigint
    now: number
    reason: string
    metadata: unknown
  }
) {
  const existingMetadata = objectMetadata(params.metadata)

  return tx.invoice.update({
    where: { id: params.id },
    data: {
      status: 'UNCOLLECTIBLE',
      amountDue: 0n,
      amountWrittenOff: { increment: params.amount },
      paidAt: null,
      metadata: { ...existingMetadata, writeOffReason: params.reason },
      updatedAt: params.now,
    },
  })
}
