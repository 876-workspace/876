import type { Prisma } from '@/db'
import { generateId } from '@/platform/ids'

import type { PaymentCreateParams } from './schemas/payment'
import {
  loadPaymentTargets,
  writePaymentEvidence,
} from './repositories/payments/shared'

export type SettledPaymentParams = Pick<
  PaymentCreateParams,
  | 'customerId'
  | 'paymentModeId'
  | 'depositAccountId'
  | 'amount'
  | 'bankCharges'
  | 'currency'
  | 'paymentDate'
  | 'referenceNumber'
  | 'notes'
> & {
  number: string
}

/**
 * Records cash that is already fully consumed by another commercial resource.
 * The resulting Payment has no unapplied customer credit and no invoice
 * allocations; the caller owns the commercial/A-R semantics of the source.
 */
export async function recordSettledPayment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: SettledPaymentParams,
  now: number
): Promise<{ id: string }> {
  const targets = await loadPaymentTargets(tx, tenantId, {
    ...params,
    allocations: [],
  })
  const paymentId = generateId('Payment')

  await writePaymentEvidence(
    tx,
    tenantId,
    {
      paymentId,
      number: params.number,
      customerId: params.customerId,
      paymentModeId: params.paymentModeId,
      depositAccountId: targets.account.id,
      amount: params.amount,
      unappliedAmount: 0n,
      bankCharges: params.bankCharges,
      currency: params.currency,
      paymentDate: params.paymentDate,
      referenceNumber: params.referenceNumber,
      notes: params.notes,
    },
    now
  )

  return { id: paymentId }
}
