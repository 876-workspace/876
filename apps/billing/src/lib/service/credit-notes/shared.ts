import { prisma, type InvoiceStatus } from '@/lib/db'
import { generateId } from '@/lib/id'
import type {
  CreditNoteApplyParams,
  CreditNoteCreateParams,
} from '@/types/credit-note'

export class CreditNoteMutationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'CreditNoteMutationError'
  }
}

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

/** A computed credit-note line ready to persist, plus its share of the totals. */
export interface ComputedLine {
  itemId: string | null
  priceId: string | null
  description: string
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
}

export interface ComputedTotals {
  lines: ComputedLine[]
  subtotalAmount: bigint
  taxAmount: bigint
  totalAmount: bigint
}

/**
 * Computes each line's total and the document rollups. Line total =
 * quantity × unitAmount − discount + tax, floored at zero so a credit line can
 * never be negative.
 */
export function computeTotals(
  lines: CreditNoteCreateParams['lines']
): ComputedTotals {
  const computed: ComputedLine[] = lines.map((line) => {
    const taxAmount = line.taxAmount ?? 0n
    const discountAmount = line.discountAmount ?? 0n
    const gross = BigInt(line.quantity) * line.unitAmount
    const net = gross - discountAmount
    const totalAmount = (net < 0n ? 0n : net) + taxAmount

    return {
      itemId: line.itemId ?? null,
      priceId: line.priceId ?? null,
      description: line.description,
      quantity: line.quantity,
      unitAmount: line.unitAmount,
      taxAmount,
      discountAmount,
      totalAmount,
    }
  })

  const subtotalAmount = computed.reduce(
    (sum, line) =>
      sum + BigInt(line.quantity) * line.unitAmount - line.discountAmount,
    0n
  )
  const taxAmount = computed.reduce((sum, line) => sum + line.taxAmount, 0n)
  const totalAmount = computed.reduce((sum, line) => sum + line.totalAmount, 0n)

  return { lines: computed, subtotalAmount, taxAmount, totalAmount }
}

interface InvoiceTarget {
  id: string
  customerId: string
  currency: string
  status: InvoiceStatus
  amountDue: bigint
  paidAt: number | null
}

/** Validates and loads the invoices a credit note is being applied to. */
export async function loadApplyTargets(
  tx: TransactionClient,
  tenantId: string,
  customerId: string,
  currency: string,
  balanceAmount: bigint,
  allocations: CreditNoteApplyParams['allocations']
): Promise<Map<string, InvoiceTarget>> {
  const invoiceIds = allocations.map((allocation) => allocation.invoiceId)
  const invoices = await tx.invoice.findMany({
    where: { tenantId, id: { in: invoiceIds } },
    select: {
      id: true,
      customerId: true,
      currency: true,
      status: true,
      amountDue: true,
      paidAt: true,
    },
  })

  if (invoices.length !== invoiceIds.length)
    throw new CreditNoteMutationError(
      'One or more invoices were not found.',
      404
    )

  const total = allocations.reduce((sum, a) => sum + a.amount, 0n)
  if (total > balanceAmount)
    throw new CreditNoteMutationError(
      'Applications cannot exceed the credit note balance.',
      422
    )

  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]))
  for (const allocation of allocations) {
    const invoice = invoiceMap.get(allocation.invoiceId)
    if (!invoice)
      throw new CreditNoteMutationError(
        'One or more invoices were not found.',
        404
      )
    if (invoice.customerId !== customerId)
      throw new CreditNoteMutationError(
        'Every invoice must belong to the credit note customer.',
        422
      )
    if (invoice.currency !== currency)
      throw new CreditNoteMutationError(
        'Every invoice must use the credit note currency.',
        422
      )
    if (
      invoice.status === 'DRAFT' ||
      invoice.status === 'VOID' ||
      invoice.status === 'PAID' ||
      invoice.status === 'UNCOLLECTIBLE'
    )
      throw new CreditNoteMutationError(
        'Only open invoices can receive a credit.',
        409
      )
    if (allocation.amount > invoice.amountDue)
      throw new CreditNoteMutationError(
        'An application cannot exceed its invoice amount due.',
        422
      )
  }

  return invoiceMap
}

/**
 * Applies credit-note allocations to invoices: reduces each invoice balance,
 * advances its status (PARTIALLY_PAID / PAID), records the allocation with the
 * pre-application invoice state for safe reversal, and draws down the credit
 * note balance. Returns the total applied.
 */
export async function applyCreditNoteAllocations(
  tx: TransactionClient,
  tenantId: string,
  creditNoteId: string,
  appliedAt: number,
  allocations: CreditNoteApplyParams['allocations'],
  invoices: Map<string, InvoiceTarget>,
  now: number
): Promise<bigint> {
  let applied = 0n

  for (const allocation of allocations) {
    const invoice = invoices.get(allocation.invoiceId)
    if (!invoice)
      throw new CreditNoteMutationError(
        'One or more invoices were not found.',
        404
      )

    const updated = await tx.invoice.updateMany({
      where: {
        id: invoice.id,
        tenantId,
        amountDue: { gte: allocation.amount },
        status: { notIn: ['PAID', 'VOID'] },
      },
      data: { amountDue: { decrement: allocation.amount }, updatedAt: now },
    })
    if (updated.count !== 1)
      throw new CreditNoteMutationError(
        'The invoice balance changed while applying this credit.',
        409
      )

    await tx.creditNoteAllocation.create({
      data: {
        id: generateId('CreditNoteAllocation'),
        tenantId,
        creditNoteId,
        invoiceId: invoice.id,
        amount: allocation.amount,
        invoiceStatusBefore: invoice.status,
        invoicePaidAtBefore: invoice.paidAt,
        createdAt: now,
        updatedAt: now,
      },
    })

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountCredited: { increment: allocation.amount },
        updatedAt: now,
      },
    })

    const current = await tx.invoice.findUnique({
      where: { id: invoice.id },
      select: { amountDue: true },
    })
    if (!current) throw new CreditNoteMutationError('Invoice not found.', 404)

    if (current.amountDue === 0n)
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: appliedAt, updatedAt: now },
      })
    else
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PARTIALLY_PAID', updatedAt: now },
      })

    applied += allocation.amount
  }

  return applied
}

/** Restores invoice balances and lifecycle fields for reversed credit applications. */
export async function reverseCreditNoteAllocations(
  tx: TransactionClient,
  tenantId: string,
  allocations: Array<{
    invoiceId: string
    amount: bigint
    invoiceStatusBefore: InvoiceStatus
    invoicePaidAtBefore: number | null
  }>,
  now: number
): Promise<void> {
  for (const allocation of allocations) {
    const updated = await tx.invoice.updateMany({
      where: { id: allocation.invoiceId, tenantId },
      data: {
        amountDue: { increment: allocation.amount },
        amountCredited: { decrement: allocation.amount },
        status: allocation.invoiceStatusBefore,
        paidAt: allocation.invoicePaidAtBefore,
        updatedAt: now,
      },
    })
    if (updated.count !== 1)
      throw new CreditNoteMutationError(
        'A credited invoice could not be restored.',
        409
      )
  }
}

export function isRetryableTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  )
}
