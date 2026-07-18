import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { BankTransactionUpdateParams } from '@/types/banking'

import { err, ok } from '../result'

/** Updates a manual transaction; payment-matched credits are immutable. */
export async function update(
  tenantId: string,
  accountId: string,
  transactionId: string,
  params: BankTransactionUpdateParams
): ServiceResult<{ id: string }> {
  const current = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, tenantId, accountId },
    select: { id: true, paymentId: true },
  })
  if (!current) return err('Bank transaction not found.', 404)
  if (current.paymentId)
    return err('Payment-matched transactions must be edited as payments.', 409)

  try {
    await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        ...(params.type !== undefined && { type: params.type }),
        ...(params.amount !== undefined && { amount: params.amount }),
        ...(params.date !== undefined && { date: params.date }),
        ...(params.description !== undefined && {
          description: params.description,
        }),
        ...(params.status !== undefined && { status: params.status }),
        ...(params.reference !== undefined && {
          reference: params.reference,
        }),
        updatedAt: nowUnixSeconds(),
      },
    })

    return ok({ id: transactionId })
  } catch (error) {
    console.error('[billing.service.bankTransactions.update]', error)
    return err('Failed to update the bank transaction.', 500)
  }
}
