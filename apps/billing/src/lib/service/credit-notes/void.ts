import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { recordLedgerEntry } from '../ledger'
import { recomputeCustomerAr } from '../customers/ar'
import {
  CreditNoteMutationError,
  isRetryableTransactionError,
  reverseCreditNoteAllocations,
} from './shared'

/**
 * Voids a credit note: reverses every invoice application (restoring those
 * balances), zeroes the credit balance, and marks the note VOID. Idempotent
 * guard rejects an already-void note.
 */
export async function voidCreditNote(
  tenantId: string,
  creditNoteId: string
): ServiceResult<{ id: string }> {
  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(
      async (tx) => {
        const creditNote = await tx.creditNote.findFirst({
          where: { id: creditNoteId, tenantId },
          include: {
            allocations: { where: { reversedAt: null } },
            refunds: { select: { id: true } },
          },
        })
        if (!creditNote)
          throw new CreditNoteMutationError('Credit note not found.', 404)
        if (creditNote.status === 'VOID')
          throw new CreditNoteMutationError(
            'This credit note is already void.',
            409
          )
        if (creditNote.refunds.length > 0)
          throw new CreditNoteMutationError(
            'A refunded credit note cannot be voided.',
            409
          )

        await reverseCreditNoteAllocations(
          tx,
          tenantId,
          creditNote.allocations,
          now
        )
        await tx.creditNoteAllocation.updateMany({
          where: { tenantId, creditNoteId, reversedAt: null },
          data: { reversedAt: now, updatedAt: now },
        })

        await tx.creditNote.update({
          where: { id: creditNoteId },
          data: {
            status: 'VOID',
            balanceAmount: 0n,
            voidedAt: now,
            updatedAt: now,
          },
        })

        await recordLedgerEntry(tx, {
          tenantId,
          customerId: creditNote.customerId,
          creditNoteId,
          type: 'CREDIT_NOTE_VOIDED',
          direction: 'DEBIT',
          amount: creditNote.totalAmount,
          currency: creditNote.currency,
          description: `Credit note ${creditNote.number} voided`,
          idempotencyKey: `credit-note:${creditNoteId}:voided`,
          effectiveAt: now,
          createdAt: now,
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
      return err('Invoice balances changed; retry voiding the credit.', 409)

    console.error('[billing.service.credit-notes.void]', error)
    return err('Failed to void the credit note.', 500)
  }
}
