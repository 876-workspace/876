import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a manual transaction while preserving payment-derived history. */
export async function deleteTransaction(
  tenantId: string,
  accountId: string,
  transactionId: string
): ServiceResult<{ id: string }> {
  const current = await prisma.bankTransaction.findFirst({
    where: { id: transactionId, tenantId, accountId },
    select: { id: true, paymentId: true },
  })
  if (!current) return err('Bank transaction not found.', 404)
  if (current.paymentId)
    return err('Payment-matched transactions must be deleted as payments.', 409)

  try {
    await prisma.bankTransaction.delete({ where: { id: transactionId } })
    return ok({ id: transactionId })
  } catch (error) {
    console.error('[billing.service.bankTransactions.delete]', error)
    return err('Failed to delete the bank transaction.', 500)
  }
}
