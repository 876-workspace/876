import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { recomputeCustomerAr } from '@/modules/customers'
import { recordLedgerEntry } from '@/modules/ledger'

export class RefundMutationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'RefundMutationError'
  }
}

export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

export interface CreditNoteRefundParams {
  refundId: string
  number: string
  customerId: string
  creditNoteId: string
  paymentModeId?: string | null
  depositAccountId?: string | null
  amount: bigint
  currency: string
  reason?: string | null
  notes?: string | null
  refundedAt: number
  now: number
}

/** Creates refund evidence from an open credit note inside the caller's transaction. */
export async function createCreditNoteRefund(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: CreditNoteRefundParams
) {
  const customer = await tx.customer.findFirst({
    where: { id: params.customerId, tenantId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!customer)
    throw new RefundMutationError('Active customer not found.', 404)

  if (params.paymentModeId) {
    const paymentMode = await tx.paymentMode.findFirst({
      where: { id: params.paymentModeId, tenantId, isActive: true },
      select: { id: true },
    })
    if (!paymentMode)
      throw new RefundMutationError('Active payment mode not found.', 404)
  }

  if (params.depositAccountId) {
    const depositAccount = await tx.bankAccount.findFirst({
      where: { id: params.depositAccountId, tenantId, isActive: true },
      select: { id: true, currency: true },
    })
    if (!depositAccount)
      throw new RefundMutationError('Active refund account not found.', 404)
    if (depositAccount.currency !== params.currency)
      throw new RefundMutationError(
        'The refund account uses a different currency.',
        422
      )
  }

  const creditNote = await tx.creditNote.findFirst({
    where: { id: params.creditNoteId, tenantId },
    select: {
      customerId: true,
      currency: true,
      status: true,
      balanceAmount: true,
    },
  })
  if (!creditNote) throw new RefundMutationError('Credit note not found.', 404)
  if (creditNote.customerId !== params.customerId)
    throw new RefundMutationError(
      'The credit note belongs to a different customer.',
      422
    )
  if (creditNote.currency !== params.currency)
    throw new RefundMutationError(
      'The credit note uses a different currency.',
      422
    )
  if (creditNote.status !== 'OPEN')
    throw new RefundMutationError(
      'Only an open credit note can be refunded.',
      409
    )
  if (creditNote.balanceAmount < params.amount)
    throw new RefundMutationError(
      'Refund exceeds the credit note balance.',
      422
    )

  const newBalance = creditNote.balanceAmount - params.amount
  await tx.creditNote.update({
    where: { id: params.creditNoteId },
    data: {
      balanceAmount: newBalance,
      status: newBalance === 0n ? 'CLOSED' : 'OPEN',
      updatedAt: params.now,
    },
  })

  await tx.refund.create({
    data: {
      id: params.refundId,
      tenantId,
      customerId: params.customerId,
      creditNoteId: params.creditNoteId,
      paymentId: null,
      paymentModeId: params.paymentModeId ?? null,
      depositAccountId: params.depositAccountId ?? null,
      number: params.number,
      amount: params.amount,
      currency: params.currency,
      reason: params.reason ?? null,
      notes: params.notes ?? null,
      refundedAt: params.refundedAt,
      createdAt: params.now,
      updatedAt: params.now,
    },
  })

  await recordLedgerEntry(tx, {
    tenantId,
    customerId: params.customerId,
    paymentId: null,
    creditNoteId: params.creditNoteId,
    refundId: params.refundId,
    type: 'REFUND_ISSUED',
    direction: 'DEBIT',
    amount: params.amount,
    currency: params.currency,
    description: `Refund ${params.number} issued`,
    idempotencyKey: `refund:${params.refundId}:issued`,
    effectiveAt: params.refundedAt,
    createdAt: params.now,
  })

  await recomputeCustomerAr(tx, tenantId, params.customerId, params.now)
  return { id: params.refundId }
}
