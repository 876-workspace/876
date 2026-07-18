import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { CreditNoteApplyParams } from '@/types/credit-note'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { recomputeCustomerAr } from '../customers/ar'
import {
  applyCreditNoteAllocations,
  CreditNoteMutationError,
  isRetryableTransactionError,
  loadApplyTargets,
} from './shared'

/**
 * Applies an open credit note's balance to one or more of the customer's open
 * invoices, drawing down the balance and closing the credit note when it
 * reaches zero. Serializable so concurrent settlement stays consistent.
 */
export async function apply(
  tenantId: string,
  creditNoteId: string,
  params: CreditNoteApplyParams
): ServiceResult<{ id: string }> {
  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(
      async (tx) => {
        const creditNote = await tx.creditNote.findFirst({
          where: { id: creditNoteId, tenantId },
          select: {
            customerId: true,
            currency: true,
            status: true,
            balanceAmount: true,
          },
        })
        if (!creditNote)
          throw new CreditNoteMutationError('Credit note not found.', 404)
        if (creditNote.status !== 'OPEN')
          throw new CreditNoteMutationError(
            'Only an open credit note can be applied.',
            409
          )

        const invoices = await loadApplyTargets(
          tx,
          tenantId,
          creditNote.customerId,
          creditNote.currency,
          creditNote.balanceAmount,
          params.allocations
        )

        const applied = await applyCreditNoteAllocations(
          tx,
          tenantId,
          creditNoteId,
          now,
          params.allocations,
          invoices,
          now
        )

        const remaining = creditNote.balanceAmount - applied
        await tx.creditNote.update({
          where: { id: creditNoteId },
          data: {
            balanceAmount: remaining,
            status: remaining === 0n ? 'CLOSED' : 'OPEN',
            updatedAt: now,
          },
        })

        await recomputeCustomerAr(tx, tenantId, creditNote.customerId, now)
      },
      { isolationLevel: 'Serializable' }
    )

    return ok({ id: creditNoteId })
  } catch (error) {
    if (error instanceof CreditNoteMutationError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Invoice balances changed; retry applying the credit.', 409)

    console.error('[billing.service.credit-notes.apply]', error)
    return err('Failed to apply the credit note.', 500)
  }
}
