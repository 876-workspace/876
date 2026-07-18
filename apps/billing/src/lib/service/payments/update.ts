import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { PaymentUpdateParams } from '@/types/payment'

import { err, ok } from '../result'
import { recordLedgerEntry } from '../ledger'
import { hasEnabledCurrency } from '../shared'
import { recomputeCustomerAr } from '../customers/ar'
import {
  applyPaymentAllocations,
  isRetryableTransactionError,
  loadPaymentTargets,
  PaymentMutationError,
  reversePaymentAllocations,
} from './shared'

/** Replaces a payment and its allocations as one serializable transaction. */
export async function update(
  tenantId: string,
  paymentId: string,
  params: PaymentUpdateParams
): ServiceResult<{ id: string }> {
  if (!(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable the payment currency before using it.', 422)

  const allocated = params.allocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0n
  )
  if (allocated > params.amount)
    return err('Allocations cannot exceed the payment amount.', 422)
  const unappliedAmount = params.amount - allocated

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
            'Only a successful payment can be corrected.',
            409
          )
        if (payment.refunds.length > 0)
          throw new PaymentMutationError(
            'A refunded payment cannot be replaced.',
            409
          )

        await recordLedgerEntry(tx, {
          tenantId,
          customerId: payment.customerId,
          paymentId,
          type: 'PAYMENT_REVERSED',
          direction: 'DEBIT',
          amount: payment.amount,
          currency: payment.currency,
          description: `Payment ${payment.number} revision ${payment.revision} reversed`,
          idempotencyKey: `payment:${paymentId}:revision:${payment.revision}:reversed`,
          effectiveAt: now,
          createdAt: now,
        })

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

        const targets = await loadPaymentTargets(tx, tenantId, params, payment)
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            customerId: params.customerId,
            paymentModeId: params.paymentModeId,
            depositAccountId: targets.account.id,
            amount: params.amount,
            unappliedAmount,
            bankCharges: params.bankCharges,
            currency: params.currency,
            paymentDate: params.paymentDate,
            referenceNumber: params.referenceNumber ?? null,
            notes: params.notes ?? null,
            revision: { increment: 1 },
            updatedAt: now,
          },
        })

        await recordLedgerEntry(tx, {
          tenantId,
          customerId: params.customerId,
          paymentId,
          type: 'PAYMENT_RECEIVED',
          direction: 'CREDIT',
          amount: params.amount,
          currency: params.currency,
          description: `Payment ${payment.number} revision ${payment.revision + 1} received`,
          idempotencyKey: `payment:${paymentId}:revision:${payment.revision + 1}:received`,
          effectiveAt: params.paymentDate,
          createdAt: now,
        })

        await applyPaymentAllocations(
          tx,
          tenantId,
          paymentId,
          params.paymentDate,
          params.allocations,
          targets.invoices,
          now
        )

        // Reconcile AR for both the previous and new customer (may differ).
        const affectedCustomers = new Set([
          payment.customerId,
          params.customerId,
        ])
        for (const affectedCustomerId of affectedCustomers)
          await recomputeCustomerAr(tx, tenantId, affectedCustomerId, now)

        await tx.bankTransaction.upsert({
          where: { tenantId_paymentId: { tenantId, paymentId } },
          create: {
            id: generateId('BankTransaction'),
            tenantId,
            accountId: targets.account.id,
            paymentId,
            type: 'CREDIT',
            amount: params.amount - params.bankCharges,
            date: params.paymentDate,
            description: `Payment ${payment.number}`,
            status: 'MATCHED',
            reference: params.referenceNumber ?? payment.number,
            createdAt: now,
            updatedAt: now,
          },
          update: {
            accountId: targets.account.id,
            amount: params.amount - params.bankCharges,
            date: params.paymentDate,
            description: `Payment ${payment.number}`,
            reference: params.referenceNumber ?? payment.number,
            updatedAt: now,
          },
        })
      },
      { isolationLevel: 'Serializable' }
    )

    return ok({ id: paymentId })
  } catch (error) {
    if (error instanceof PaymentMutationError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Invoice balances changed; retry the payment.', 409)

    console.error('[billing.service.payments.update]', error)
    return err('Failed to update the payment.', 500)
  }
}
