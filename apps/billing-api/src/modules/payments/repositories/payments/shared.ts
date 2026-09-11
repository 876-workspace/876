import type { InvoiceStatus } from '@/db'
import { prisma } from '@/db/client'
import {
  isCollectibleInvoiceStatus,
  projectCollectibleInvoiceStatus,
} from '@/modules/documents'
import { generateId } from '@/platform/ids'
import type { PaymentCreateParams } from '../../schemas/payment'
import {
  attributionData,
  type IntegrationAttribution,
} from '../integrations/attribution'

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
  amountPaid: bigint
  amountCredited: bigint
  dueAt: number | null
  sentAt: number | null
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

type PaymentEvidenceParams = Pick<
  PaymentCreateParams,
  | 'customerId'
  | 'paymentModeId'
  | 'amount'
  | 'bankCharges'
  | 'currency'
  | 'paymentDate'
  | 'referenceNumber'
  | 'notes'
> & {
  paymentId: string
  depositAccountId: string
  number: string
  unappliedAmount: bigint
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
        amountPaid: true,
        amountCredited: true,
        dueAt: true,
        sentAt: true,
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
    if (!isCollectibleInvoiceStatus(invoice.status))
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

/**
 * Writes the canonical Payment and matched bank credit after the caller has
 * resolved the commercial meaning of the cash. It intentionally does not post
 * customer A/R ledger entries or invoice allocations.
 */
export async function writePaymentEvidence(
  tx: TransactionClient,
  tenantId: string,
  params: PaymentEvidenceParams,
  now: number,
  attribution?: IntegrationAttribution
) {
  await tx.payment.create({
    data: {
      id: params.paymentId,
      tenantId,
      ...attributionData(attribution),
      customerId: params.customerId,
      paymentModeId: params.paymentModeId,
      depositAccountId: params.depositAccountId,
      number: params.number,
      status: 'SUCCEEDED',
      amount: params.amount,
      unappliedAmount: params.unappliedAmount,
      bankCharges: params.bankCharges,
      currency: params.currency,
      paymentDate: params.paymentDate,
      referenceNumber: params.referenceNumber ?? null,
      notes: params.notes ?? null,
      createdAt: now,
      updatedAt: now,
    },
  })

  await tx.bankTransaction.create({
    data: {
      id: generateId('BankTransaction'),
      tenantId,
      accountId: params.depositAccountId,
      paymentId: params.paymentId,
      type: 'CREDIT',
      amount: params.amount - params.bankCharges,
      date: params.paymentDate,
      description: `Payment ${params.number}`,
      status: 'MATCHED',
      reference: params.referenceNumber ?? params.number,
      createdAt: now,
      updatedAt: now,
    },
  })
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
      select: {
        amountDue: true,
        amountPaid: true,
        amountCredited: true,
        dueAt: true,
        sentAt: true,
      },
    })
    if (!current) throw new PaymentMutationError('Invoice not found.', 404)

    const status = projectCollectibleInvoiceStatus({
      ...current,
      asOf: now,
    })

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status,
        paidAt: status === 'PAID' ? paymentDate : null,
        updatedAt: now,
      },
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
