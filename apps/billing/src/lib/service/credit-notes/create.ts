import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { CreditNoteCreateParams } from '@/types/credit-note'
import type { ServiceResult } from '@/types/api'

import { nextDocumentNumber } from '../documents/numbers'
import { recordLedgerEntry } from '../ledger'
import { err, ok } from '../result'
import { hasEnabledCurrency } from '../shared'
import { recomputeCustomerAr } from '../customers/ar'
import { computeTotals, CreditNoteMutationError } from './shared'

/**
 * Issues a credit note (status OPEN) with its full total available as customer
 * credit. Applying that credit to invoices is a separate step (`apply`).
 */
export async function create(
  tenantId: string,
  params: CreditNoteCreateParams
): ServiceResult<{ id: string }> {
  if (!(await hasEnabledCurrency(tenantId, params.currency)))
    return err('Enable the credit note currency before using it.', 422)

  const totals = computeTotals(params.lines)
  if (totals.totalAmount <= 0n)
    return err('A credit note total must be greater than zero.', 422)

  const now = nowUnixSeconds()
  const number = await nextDocumentNumber(tenantId, 'CREDIT_NOTE', now)
  const creditNoteId = generateId('CreditNote')
  const preference = await prisma.documentPreference.findUnique({
    where: {
      tenantId_documentType: { tenantId, documentType: 'CREDIT_NOTE' },
    },
    select: { customerNote: true, termsAndConditions: true },
  })

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: params.customerId, tenantId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (!customer)
        throw new CreditNoteMutationError('Active customer not found.', 404)

      if (params.invoiceId) {
        const invoice = await tx.invoice.findFirst({
          where: { id: params.invoiceId, tenantId },
          select: { customerId: true, currency: true },
        })
        if (!invoice)
          throw new CreditNoteMutationError('Invoice not found.', 404)
        if (invoice.customerId !== params.customerId)
          throw new CreditNoteMutationError(
            'The invoice belongs to a different customer.',
            422
          )
        if (invoice.currency !== params.currency)
          throw new CreditNoteMutationError(
            'The invoice uses a different currency.',
            422
          )
      }

      await tx.creditNote.create({
        data: {
          id: creditNoteId,
          tenantId,
          customerId: params.customerId,
          invoiceId: params.invoiceId ?? null,
          number,
          status: 'OPEN',
          currency: params.currency,
          reason: params.reason ?? null,
          subtotalAmount: totals.subtotalAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          balanceAmount: totals.totalAmount,
          notes:
            params.notes === undefined
              ? (preference?.customerNote ?? null)
              : params.notes,
          terms:
            params.terms === undefined
              ? (preference?.termsAndConditions ?? null)
              : params.terms,
          issueAt: params.issueAt ?? now,
          createdAt: now,
          updatedAt: now,
          lines: {
            create: totals.lines.map((line) => ({
              id: generateId('CreditNoteLine'),
              itemId: line.itemId,
              priceId: line.priceId,
              description: line.description,
              quantity: line.quantity,
              unitAmount: line.unitAmount,
              taxAmount: line.taxAmount,
              discountAmount: line.discountAmount,
              totalAmount: line.totalAmount,
              createdAt: now,
              updatedAt: now,
            })),
          },
        },
      })

      await recordLedgerEntry(tx, {
        tenantId,
        customerId: params.customerId,
        creditNoteId,
        type: 'CREDIT_NOTE_ISSUED',
        direction: 'CREDIT',
        amount: totals.totalAmount,
        currency: params.currency,
        description: `Credit note ${number} issued`,
        idempotencyKey: `credit-note:${creditNoteId}:issued`,
        effectiveAt: params.issueAt ?? now,
        createdAt: now,
      })

      await recomputeCustomerAr(tx, tenantId, params.customerId, now)
    })

    return ok({ id: creditNoteId })
  } catch (error) {
    if (error instanceof CreditNoteMutationError)
      return err(error.message, error.status)

    console.error('[billing.service.credit-notes.create]', error)
    return err('Failed to create the credit note.', 500)
  }
}
