import { prisma } from '@/db/client'

export function runInvoiceTransaction<T>(
  work: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>
) {
  return prisma.$transaction(work, { isolationLevel: 'Serializable' })
}

export function findInvoiceForFinalize(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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

export function findInvoiceForVoid(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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

export function markInvoiceVoid(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    id: string
    now: number
    reason?: string | null
    metadata: unknown
  }
) {
  const existingMetadata =
    typeof params.metadata === 'object' && params.metadata !== null
      ? params.metadata
      : undefined
  return tx.invoice.update({
    where: { id: params.id },
    data: {
      status: 'VOID',
      amountDue: 0n,
      voidedAt: params.now,
      metadata: params.reason
        ? { voidReason: params.reason }
        : existingMetadata,
      updatedAt: params.now,
    },
  })
}
