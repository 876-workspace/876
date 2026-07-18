import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes an unused account; accounts with financial history are archived. */
export async function deleteAccount(
  tenantId: string,
  accountId: string
): ServiceResult<{ id: string }> {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, tenantId },
    include: { _count: { select: { payments: true, transactions: true } } },
  })
  if (!account) return err('Bank account not found.', 404)
  if (account._count.payments > 0 || account._count.transactions > 0)
    return err(
      'Archive this account instead because it has financial activity.',
      409
    )

  try {
    await prisma.bankAccount.delete({ where: { id: accountId } })
    return ok({ id: accountId })
  } catch (error) {
    console.error('[billing.service.bankAccounts.delete]', error)
    return err('Failed to delete the bank account.', 500)
  }
}
