import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { PaymentCreateParams } from '@/types/payment'

import { nextDocumentNumber } from '../documents/numbers'
import {
  attributionData,
  type AttributedCreateResult,
  type IntegrationAttribution,
  resolveIdempotencyReplay,
} from '../integrations/attribution'
import { recordLedgerEntry } from '../ledger'
import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'
import { recomputeCustomerAr } from '../customers/ar'
import {
  applyPaymentAllocations,
  isRetryableTransactionError,
  loadPaymentTargets,
  PaymentMutationError,
} from './shared'

/** Records money received, settles invoices, and posts a matched bank credit. */
export async function create(
  tenantId: string,
  params: PaymentCreateParams,
  attribution?: IntegrationAttribution
): ServiceResult<AttributedCreateResult> {
  const replay = attribution
    ? resolveIdempotencyReplay(
        await findByIdempotencyKey(tenantId, attribution),
        attribution
      )
    : null
  if (replay) return replay

  if (!(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable the payment currency before using it.', 422)

  // The unallocated remainder becomes customer credit (advance / overpayment).
  const allocated = params.allocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0n
  )
  if (allocated > params.amount)
    return err('Allocations cannot exceed the payment amount.', 422)
  const unappliedAmount = params.amount - allocated

  const now = nowUnixSeconds()
  const number = await nextDocumentNumber(tenantId, 'PAYMENT', now)
  const paymentId = generateId('Payment')

  try {
    await prisma.$transaction(
      async (tx) => {
        const targets = await loadPaymentTargets(tx, tenantId, params)

        await tx.payment.create({
          data: {
            id: paymentId,
            tenantId,
            ...attributionData(attribution),
            customerId: params.customerId,
            paymentModeId: params.paymentModeId,
            depositAccountId: targets.account.id,
            number,
            status: 'SUCCEEDED',
            amount: params.amount,
            unappliedAmount,
            bankCharges: params.bankCharges,
            currency: params.currency,
            paymentDate: params.paymentDate,
            referenceNumber: params.referenceNumber ?? null,
            notes: params.notes ?? null,
            createdAt: now,
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
          description: `Payment ${number} received`,
          idempotencyKey: `payment:${paymentId}:revision:0:received`,
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

        await recomputeCustomerAr(tx, tenantId, params.customerId, now)

        await tx.bankTransaction.create({
          data: {
            id: generateId('BankTransaction'),
            tenantId,
            accountId: targets.account.id,
            paymentId,
            type: 'CREDIT',
            amount: params.amount - params.bankCharges,
            date: params.paymentDate,
            description: `Payment ${number}`,
            status: 'MATCHED',
            reference: params.referenceNumber ?? number,
            createdAt: now,
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
    if (isUniqueConstraintError(error) && attribution) {
      const replayAfterConflict = resolveIdempotencyReplay(
        await findByIdempotencyKey(tenantId, attribution),
        attribution
      )
      if (replayAfterConflict) return replayAfterConflict

      if (
        attribution.sourceExternalReference &&
        (await prisma.payment.findFirst({
          where: {
            tenantId,
            sourceAppId: attribution.sourceAppId,
            sourceExternalReference: attribution.sourceExternalReference,
          },
          select: { id: true },
        }))
      )
        return err(
          'A payment already exists for this source external reference.',
          409
        )

      return err('A payment with these unique details already exists.', 409)
    }
    if (isRetryableTransactionError(error))
      return err('Invoice balances changed; retry the payment.', 409)

    console.error('[billing.service.payments.create]', error)
    return err('Failed to create the payment.', 500)
  }
}

function findByIdempotencyKey(
  tenantId: string,
  attribution: IntegrationAttribution
) {
  return prisma.payment.findFirst({
    where: {
      tenantId,
      sourceAppId: attribution.sourceAppId,
      sourceIdempotencyKey: attribution.sourceIdempotencyKey,
    },
    select: { id: true, sourcePayloadHash: true },
  })
}
