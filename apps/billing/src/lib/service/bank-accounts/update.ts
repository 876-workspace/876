import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { BankAccountUpdateParams } from '@/types/banking'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Updates account details without allowing historical currency rewrites. */
export async function update(
  tenantId: string,
  accountId: string,
  params: BankAccountUpdateParams
): ServiceResult<{ id: string }> {
  const current = await prisma.bankAccount.findFirst({
    where: { id: accountId, tenantId },
    include: { _count: { select: { payments: true, transactions: true } } },
  })
  if (!current) return err('Bank account not found.', 404)

  if (params.currency && params.currency !== current.currency) {
    if (current._count.payments > 0 || current._count.transactions > 0)
      return err(
        'An account with financial activity cannot change currency.',
        409
      )
    if (!(await hasEnabledCurrency(tenantId, params.currency)))
      return err('Enable the account currency before using it.', 422)
  }

  try {
    await prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        ...(params.name !== undefined && { name: params.name }),
        ...(params.accountType !== undefined && {
          accountType: params.accountType,
        }),
        ...(params.currency !== undefined && { currency: params.currency }),
        ...(params.description !== undefined && {
          description: params.description,
        }),
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        updatedAt: nowUnixSeconds(),
      },
    })

    return ok({ id: accountId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A bank account with this name already exists.', 409)

    console.error('[billing.service.bankAccounts.update]', error)
    return err('Failed to update the bank account.', 500)
  }
}
