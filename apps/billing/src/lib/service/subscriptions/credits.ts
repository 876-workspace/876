import { type PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'

import { recomputeCustomerAr } from '../customers/ar'
import { nextDocumentNumber } from '../documents/numbers'
import { recordLedgerEntry } from '../ledger'

/** Issues unapplied customer credit while preserving subscription provenance. */
export async function createSubscriptionCredit(
  tx: PrismaTransaction,
  params: {
    tenantId: string
    subscriptionId: string
    customerId: string
    currency: string
    amount: bigint
    description: string
    reason: string
    source: 'PAUSE' | 'PRORATION'
    createdAt: number
  }
): Promise<string | null> {
  if (params.amount <= 0n) return null

  const number = await nextDocumentNumber(
    params.tenantId,
    'CREDIT_NOTE',
    params.createdAt,
    tx
  )
  const creditNoteId = generateId('CreditNote')
  await tx.creditNote.create({
    data: {
      id: creditNoteId,
      tenantId: params.tenantId,
      customerId: params.customerId,
      number,
      status: 'OPEN',
      currency: params.currency,
      reason: params.reason,
      subtotalAmount: params.amount,
      totalAmount: params.amount,
      balanceAmount: params.amount,
      issueAt: params.createdAt,
      metadata: {
        subscriptionId: params.subscriptionId,
        source: params.source,
      },
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
      lines: {
        create: {
          id: generateId('CreditNoteLine'),
          description: params.description,
          quantity: 1,
          unitAmount: params.amount,
          totalAmount: params.amount,
          createdAt: params.createdAt,
          updatedAt: params.createdAt,
        },
      },
    },
  })
  await recordLedgerEntry(tx, {
    tenantId: params.tenantId,
    customerId: params.customerId,
    subscriptionId: params.subscriptionId,
    creditNoteId,
    type: 'CREDIT_NOTE_ISSUED',
    direction: 'CREDIT',
    amount: params.amount,
    currency: params.currency,
    description: `Subscription credit note ${number} issued`,
    idempotencyKey: `credit-note:${creditNoteId}:issued`,
    effectiveAt: params.createdAt,
    createdAt: params.createdAt,
  })
  await recomputeCustomerAr(
    tx,
    params.tenantId,
    params.customerId,
    params.createdAt
  )

  return creditNoteId
}
