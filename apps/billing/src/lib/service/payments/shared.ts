import { prisma, type InvoiceStatus } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { PaymentCreateParams } from '@/types/payment'

export class PaymentMutationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'PaymentMutationError'
  }
}

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

interface InvoiceTarget {
  id: string
  customerId: string
  currency: string
  status: InvoiceStatus
  amountDue: bigint
  paidAt: number | null
}

interface PaymentTargets {
  account: { id: string; currency: string }
  invoices: Map<string, InvoiceTarget>
}

interface CurrentPaymentTargets {
  customerId: string
  paymentModeId: string
  depositAccountId: string
}

/** Resolves and validates every tenant-owned resource referenced by a payment. */
export async function loadPaymentTargets(
  tx: TransactionClient,
  tenantId: string,
  params: PaymentCreateParams,
  current?: CurrentPaymentTargets
): Promise<PaymentTargets> {
  const invoiceIds = params.allocations.map(
    (allocation) => allocation.invoiceId
  )
  const [customer, mode, account, invoices] = await Promise.all([
    tx.customer.findFirst({
      where: {
        id: params.customerId,
        tenantId,
        ...(current?.customerId === params.customerId
          ? {}
          : { status: 'ACTIVE' as const }),
      },
      select: { id: true },
    }),
    tx.paymentMode.findFirst({
      where: {
        id: params.paymentModeId,
        tenantId,
        ...(current?.paymentModeId === params.paymentModeId
          ? {}
          : { isActive: true }),
      },
      select: { id: true },
    }),
    tx.bankAccount.findFirst({
      where: {
        id: params.depositAccountId,
        tenantId,
        ...(current?.depositAccountId === params.depositAccountId
          ? {}
          : { isActive: true }),
      },
      select: { id: true, currency: true },
    }),
    tx.invoice.findMany({
      where: { tenantId, id: { in: invoiceIds } },
      select: {
        id: true,
        customerId: true,
        currency: true,
        status: true,
        amountDue: true,
        paidAt: true,
      },
    }),
  ])

  if (!customer) throw new PaymentMutationError('Customer not found.', 404)
  if (!mode)
    throw new PaymentMutationError('Active payment mode not found.', 404)
  if (!account)
    throw new PaymentMutationError('Active deposit account not found.', 404)
  if (account.currency !== params.currency)
    throw new PaymentMutationError(
      'The deposit account uses a different currency.',
      422
    )
  if (invoices.length !== invoiceIds.length)
    throw new PaymentMutationError('One or more invoices were not found.', 404)

  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]))
  for (const allocation of params.allocations) {
    const invoice = invoiceMap.get(allocation.invoiceId)
    if (!invoice)
      throw new PaymentMutationError(
        'One or more invoices were not found.',
        404
      )
    if (invoice.customerId !== params.customerId)
      throw new PaymentMutationError(
        'Every invoice must belong to the selected customer.',
        422
      )
    if (invoice.currency !== params.currency)
      throw new PaymentMutationError(
        'Every invoice must use the payment currency.',
        422
      )
    if (
      invoice.status === 'DRAFT' ||
      invoice.status === 'VOID' ||
      invoice.status === 'PAID' ||
      invoice.status === 'UNCOLLECTIBLE'
    )
      throw new PaymentMutationError(
        'Only open invoices can receive a payment allocation.',
        409
      )
    if (allocation.amount > invoice.amountDue)
      throw new PaymentMutationError(
        'An allocation cannot exceed its invoice amount due.',
        422
      )
  }

  return { account, invoices: invoiceMap }
}

/** Applies allocations and captures the invoice state needed for safe reversal. */
export async function applyPaymentAllocations(
  tx: TransactionClient,
  tenantId: string,
  paymentId: string,
  paymentDate: number,
  allocations: PaymentCreateParams['allocations'],
  invoices: Map<string, InvoiceTarget>,
  now: number
) {
  for (const allocation of allocations) {
    const invoice = invoices.get(allocation.invoiceId)
    if (!invoice)
      throw new PaymentMutationError(
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
      throw new PaymentMutationError(
        'The invoice balance changed while applying this payment.',
        409
      )

    await tx.paymentAllocation.create({
      data: {
        id: generateId('PaymentAllocation'),
        tenantId,
        paymentId,
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
        amountPaid: { increment: allocation.amount },
        updatedAt: now,
      },
    })

    const current = await tx.invoice.findUnique({
      where: { id: invoice.id },
      select: { amountDue: true },
    })
    if (!current) throw new PaymentMutationError('Invoice not found.', 404)

    // Fully settled -> PAID; still owing after a payment -> PARTIALLY_PAID.
    if (current.amountDue === 0n)
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: paymentDate, updatedAt: now },
      })
    else
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PARTIALLY_PAID', updatedAt: now },
      })
  }
}

/** Restores invoice balances and lifecycle fields for removed allocations. */
export async function reversePaymentAllocations(
  tx: TransactionClient,
  tenantId: string,
  allocations: Array<{
    invoiceId: string
    amount: bigint
    invoiceStatusBefore: InvoiceStatus
    invoicePaidAtBefore: number | null
  }>,
  now: number
) {
  for (const allocation of allocations) {
    const updated = await tx.invoice.updateMany({
      where: { id: allocation.invoiceId, tenantId },
      data: {
        amountDue: { increment: allocation.amount },
        amountPaid: { decrement: allocation.amount },
        status: allocation.invoiceStatusBefore,
        paidAt: allocation.invoicePaidAtBefore,
        updatedAt: now,
      },
    })
    if (updated.count !== 1)
      throw new PaymentMutationError(
        'An allocated invoice could not be restored.',
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
