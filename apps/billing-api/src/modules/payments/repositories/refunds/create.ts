import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import type { ServiceResult } from '../../schemas/api'
import type { RefundCreateParams } from '../../schemas/refund'

import { nextDocumentNumber } from '@/modules/documents'
import { recordLedgerEntry } from '@/modules/ledger'
import { err, ok } from '../result'
import { hasEnabledCurrency } from '@/modules/currencies'
import { recomputeCustomerAr } from '@/modules/customers'
import { RefundMutationError } from './shared'
import { isRetryableTransactionError } from '@/platform/prisma-errors'

/** Records a cash return to a customer drawn from a credit note or an overpaid payment. */
export async function create(
  tenantId: string,
  params: RefundCreateParams,
  sourceAppId?: string
): ServiceResult<{ id: string }> {
  if (!(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable the refund currency before using it.', 422)
  if (sourceAppId && params.creditNoteId)
    return err('Credit-note refunds require tenant finance authority.', 403)

  const now = nowUnixSeconds()
  const number = await nextDocumentNumber(tenantId, 'REFUND', now)
  const refundId = generateId('Refund')

  try {
    await prisma.$transaction(
      async (tx) => {
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
            throw new RefundMutationError(
              'Active refund account not found.',
              404
            )
          if (depositAccount.currency !== params.currency)
            throw new RefundMutationError(
              'The refund account uses a different currency.',
              422
            )
        }

        if (params.creditNoteId) {
          const creditNote = await tx.creditNote.findFirst({
            where: { id: params.creditNoteId, tenantId },
            select: {
              customerId: true,
              currency: true,
              status: true,
              balanceAmount: true,
            },
          })
          if (!creditNote)
            throw new RefundMutationError('Credit note not found.', 404)
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
              updatedAt: now,
            },
          })
        } else {
          const payment = await tx.payment.findFirst({
            where: {
              id: params.paymentId,
              tenantId,
              salesReceipt: { is: null },
              ...(sourceAppId ? { sourceAppId } : {}),
            },
            select: {
              customerId: true,
              currency: true,
              status: true,
              amount: true,
              amountRefunded: true,
              unappliedAmount: true,
            },
          })
          if (!payment) throw new RefundMutationError('Payment not found.', 404)
          if (
            payment.status !== 'SUCCEEDED' &&
            payment.status !== 'PARTIALLY_REFUNDED'
          )
            throw new RefundMutationError(
              'Only a successful payment with refundable credit can be refunded.',
              409
            )
          if (payment.customerId !== params.customerId)
            throw new RefundMutationError(
              'The payment belongs to a different customer.',
              422
            )
          if (payment.currency !== params.currency)
            throw new RefundMutationError(
              'The payment uses a different currency.',
              422
            )
          if (payment.unappliedAmount < params.amount)
            throw new RefundMutationError(
              "Refund exceeds the payment's unapplied amount.",
              422
            )

          const amountRefunded = payment.amountRefunded + params.amount
          await tx.payment.update({
            where: { id: params.paymentId },
            data: {
              unappliedAmount: { decrement: params.amount },
              amountRefunded: { increment: params.amount },
              status:
                amountRefunded === payment.amount
                  ? 'REFUNDED'
                  : 'PARTIALLY_REFUNDED',
              updatedAt: now,
            },
          })
        }

        await tx.refund.create({
          data: {
            id: refundId,
            tenantId,
            customerId: params.customerId,
            creditNoteId: params.creditNoteId ?? null,
            paymentId: params.paymentId ?? null,
            paymentModeId: params.paymentModeId ?? null,
            depositAccountId: params.depositAccountId ?? null,
            number,
            amount: params.amount,
            currency: params.currency,
            reason: params.reason ?? null,
            notes: params.notes ?? null,
            refundedAt: params.refundedAt,
            createdAt: now,
            updatedAt: now,
          },
        })

        await recordLedgerEntry(tx, {
          tenantId,
          customerId: params.customerId,
          paymentId: params.paymentId ?? null,
          creditNoteId: params.creditNoteId ?? null,
          refundId,
          type: 'REFUND_ISSUED',
          direction: 'DEBIT',
          amount: params.amount,
          currency: params.currency,
          description: `Refund ${number} issued`,
          idempotencyKey: `refund:${refundId}:issued`,
          effectiveAt: params.refundedAt,
          createdAt: now,
        })

        await recomputeCustomerAr(tx, tenantId, params.customerId, now)
      },
      { isolationLevel: 'Serializable' }
    )

    return ok({ id: refundId })
  } catch (error) {
    if (error instanceof RefundMutationError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Balances changed; retry the refund.', 409)

    console.error('[billing.service.refunds.create]', error)
    return err('Failed to record the refund.', 500)
  }
}
