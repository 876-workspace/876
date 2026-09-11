import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import type {
  PaymentApplyParams,
  PaymentCreateParams,
} from '../../schemas/payment'
import type { ServiceResult } from '../../schemas/api'

import { recomputeCustomerAr } from '@/modules/customers'
import { err, ok } from '../result'
import {
  applyPaymentAllocations,
  loadPaymentTargets,
  PaymentMutationError,
} from './shared'
import { isRetryableTransactionError } from '@/platform/prisma-errors'

/** Applies previously unapplied ordinary customer cash to open invoices. */
export async function apply(
  tenantId: string,
  paymentId: string,
  params: PaymentApplyParams,
  sourceAppId?: string
): ServiceResult<{ id: string }> {
  const total = params.allocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0n
  )

  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findFirst({
          where: {
            id: paymentId,
            tenantId,
            salesReceipt: { is: null },
            ...(sourceAppId ? { sourceAppId } : {}),
          },
        })
        if (!payment) throw new PaymentMutationError('Payment not found.', 404)
        if (
          payment.status !== 'SUCCEEDED' &&
          payment.status !== 'PARTIALLY_REFUNDED'
        )
          throw new PaymentMutationError(
            'Only a successful payment with available credit can be applied.',
            409
          )
        if (total > payment.unappliedAmount)
          throw new PaymentMutationError(
            'Allocations cannot exceed the unapplied payment amount.',
            422
          )

        const paymentParams: PaymentCreateParams = {
          customerId: payment.customerId,
          paymentModeId: payment.paymentModeId,
          depositAccountId: payment.depositAccountId,
          amount: payment.amount,
          bankCharges: payment.bankCharges,
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
          allocations: params.allocations,
        }
        const targets = await loadPaymentTargets(
          tx,
          tenantId,
          paymentParams,
          payment
        )

        await applyPaymentAllocations(
          tx,
          tenantId,
          paymentId,
          payment.paymentDate,
          params.allocations,
          targets.invoices,
          now
        )
        await tx.payment.update({
          where: { id: paymentId },
          data: { unappliedAmount: { decrement: total }, updatedAt: now },
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
      return err('Invoice balances changed; retry applying the payment.', 409)

    console.error('[billing.service.payments.apply]', error)
    return err('Failed to apply the payment.', 500)
  }
}
