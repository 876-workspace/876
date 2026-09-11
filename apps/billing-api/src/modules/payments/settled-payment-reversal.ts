import type { Prisma } from '@/db'

import { PaymentMutationError } from './repositories/payments/shared'

/**
 * Cancels payment/bank evidence that was fully consumed by a non-A/R commercial
 * resource. It deliberately posts no customer ledger entry because the original
 * settled payment did not create customer credit or settle an invoice.
 */
export async function reverseSettledPayment(
  tx: Prisma.TransactionClient,
  tenantId: string,
  paymentId: string,
  now: number
): Promise<void> {
  const payment = await tx.payment.findFirst({
    where: { id: paymentId, tenantId },
    include: {
      invoiceAllocations: { where: { reversedAt: null }, select: { id: true } },
      refunds: { select: { id: true } },
    },
  })
  if (!payment) throw new PaymentMutationError('Payment not found.', 404)
  if (payment.status !== 'SUCCEEDED')
    throw new PaymentMutationError(
      'Only a successful settled payment can be reversed.',
      409
    )
  if (payment.invoiceAllocations.length > 0 || payment.unappliedAmount !== 0n)
    throw new PaymentMutationError(
      'This payment is not exclusively settled by its commercial source.',
      409
    )
  if (payment.refunds.length > 0)
    throw new PaymentMutationError(
      'A refunded payment cannot be reversed as an original-entry correction.',
      409
    )

  await tx.payment.update({
    where: { id: paymentId },
    data: {
      status: 'CANCELED',
      revision: { increment: 1 },
      updatedAt: now,
    },
  })
  await tx.bankTransaction.updateMany({
    where: { tenantId, paymentId },
    data: { status: 'EXCLUDED', updatedAt: now },
  })
}
