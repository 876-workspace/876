import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { BankTransactionCreateParams } from '@/types/banking'

import { err, ok } from '../result'

/** Records a manual debit or credit against an active account. */
export async function create(
  tenantId: string,
  accountId: string,
  params: BankTransactionCreateParams
): ServiceResult<{ id: string }> {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, tenantId, isActive: true },
    select: { id: true },
  })
  if (!account) return err('Active bank account not found.', 404)

  try {
    const now = nowUnixSeconds()
    const transaction = await prisma.bankTransaction.create({
      data: {
        id: generateId('BankTransaction'),
        tenantId,
        accountId,
        type: params.type,
        amount: params.amount,
        date: params.date,
        description: params.description ?? null,
        status: 'UNCATEGORIZED',
        reference: params.reference ?? null,
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok({ id: transaction.id })
  } catch (error) {
    console.error('[billing.service.bankTransactions.create]', error)
    return err('Failed to create the bank transaction.', 500)
  }
}
