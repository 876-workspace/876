import type { Prisma } from '@/db'
import { recomputeCustomerAr } from '@/modules/customers'
import { recordLedgerEntry } from '@/modules/ledger'
import { generateId } from '@/platform/ids'

import type { ComputedTotals } from './shared'

export interface CreditNoteRecordParams {
  id: string
  customerId: string
  invoiceId?: string | null
  salesReceiptId?: string | null
  number: string
  currency: string
  reason?: string | null
  totals: ComputedTotals
  notes?: string | null
  terms?: string | null
  issueAt: number
  now: number
}

/** Persists one issued credit note plus its customer-ledger evidence. */
export async function recordCreditNote(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: CreditNoteRecordParams
) {
  await tx.creditNote.create({
    data: {
      id: params.id,
      tenantId,
      customerId: params.customerId,
      invoiceId: params.invoiceId ?? null,
      salesReceiptId: params.salesReceiptId ?? null,
      number: params.number,
      status: 'OPEN',
      currency: params.currency,
      reason: params.reason ?? null,
      subtotalAmount: params.totals.subtotalAmount,
      taxAmount: params.totals.taxAmount,
      totalAmount: params.totals.totalAmount,
      balanceAmount: params.totals.totalAmount,
      notes: params.notes ?? null,
      terms: params.terms ?? null,
      issueAt: params.issueAt,
      createdAt: params.now,
      updatedAt: params.now,
      lines: {
        create: params.totals.lines.map((line) => ({
          id: generateId('CreditNoteLine'),
          itemId: line.itemId,
          priceId: line.priceId,
          description: line.description,
          quantity: line.quantity,
          unitAmount: line.unitAmount,
          taxAmount: line.taxAmount,
          discountAmount: line.discountAmount,
          totalAmount: line.totalAmount,
          createdAt: params.now,
          updatedAt: params.now,
        })),
      },
    },
  })

  await recordLedgerEntry(tx, {
    tenantId,
    customerId: params.customerId,
    creditNoteId: params.id,
    type: 'CREDIT_NOTE_ISSUED',
    direction: 'CREDIT',
    amount: params.totals.totalAmount,
    currency: params.currency,
    description: `Credit note ${params.number} issued`,
    idempotencyKey: `credit-note:${params.id}:issued`,
    effectiveAt: params.issueAt,
    createdAt: params.now,
  })

  await recomputeCustomerAr(tx, tenantId, params.customerId, params.now)
  return { id: params.id }
}
