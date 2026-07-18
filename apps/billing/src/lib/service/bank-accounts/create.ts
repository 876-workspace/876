import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { BankAccountCreateParams } from '@/types/banking'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Creates a tenant-owned, single-currency financial account. */
export async function create(
  tenantId: string,
  params: BankAccountCreateParams
): ServiceResult<{ id: string }> {
  if (!(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable the account currency before using it.', 422)

  try {
    const now = nowUnixSeconds()
    const account = await prisma.bankAccount.create({
      data: {
        id: generateId('BankAccount'),
        tenantId,
        name: params.name,
        accountType: params.accountType,
        currency: params.currency,
        description: params.description ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok({ id: account.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A bank account with this name already exists.', 409)

    console.error('[billing.service.bankAccounts.create]', error)
    return err('Failed to create the bank account.', 500)
  }
}
