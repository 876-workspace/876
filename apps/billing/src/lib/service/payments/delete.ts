import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { recordLedgerEntry } from '../ledger'
import { recomputeCustomerAr } from '../customers/ar'
import {
  isRetryableTransactionError,
  PaymentMutationError,
  reversePaymentAllocations,
} from './shared'

/** Cancels a manual payment after restoring every allocated invoice balance. */
export async function deletePayment(
  tenantId: string,
  paymentId: string
): ServiceResult<{ id: string }> {
  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findFirst({
          where: { id: paymentId, tenantId },
          include: {
            invoiceAllocations: { where: { reversedAt: null } },
            refunds: { select: { id: true } },
          },
        })
        if (!payment) throw new PaymentMutationError('Payment not found.', 404)
        if (payment.status !== 'SUCCEEDED')
          throw new PaymentMutationError(
            'Only a successful payment can be canceled.',
            409
          )
        if (payment.refunds.length > 0)
          throw new PaymentMutationError(
            'A refunded payment cannot be canceled.',
            409
          )

        await reversePaymentAllocations(
          tx,
          tenantId,
          payment.invoiceAllocations,
          now
        )
        await tx.paymentAllocation.updateMany({
          where: { tenantId, paymentId, reversedAt: null },
          data: { reversedAt: now, updatedAt: now },
        })
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'CANCELED',
            unappliedAmount: 0n,
            revision: { increment: 1 },
            updatedAt: now,
          },
        })
        await tx.bankTransaction.updateMany({
          where: { tenantId, paymentId },
          data: { status: 'EXCLUDED', updatedAt: now },
        })
        await recordLedgerEntry(tx, {
          tenantId,
          customerId: payment.customerId,
          paymentId,
          type: 'PAYMENT_REVERSED',
          direction: 'DEBIT',
          amount: payment.amount,
          currency: payment.currency,
          description: `Payment ${payment.number} canceled`,
          idempotencyKey: `payment:${paymentId}:revision:${payment.revision}:reversed`,
          effectiveAt: now,
          createdAt: now,
        })

        await recomputeCustomerAr(tx, tenantId, payment.customerId, now)
      },
      { isolationLevel: 'Serializable' }
    )

    return ok({ id: paymentId })
  } catch (error) {
    if (error instanceof PaymentMutationError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Invoice balances changed; retry deleting the payment.', 409)

    console.error('[billing.service.payments.delete]', error)
    return err('Failed to delete the payment.', 500)
  }
}
