import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { InvoiceVoidParams } from '@/types/invoice'
import type { ServiceResult } from '@/types/api'

import { recomputeCustomerAr } from '../customers/ar'
import { recordLedgerEntry } from '../ledger'
import { err, ok } from '../result'

/** Voids an unsettled finalized invoice without deleting its history. */
export async function voidInvoice(
  tenantId: string,
  invoiceId: string,
  params: InvoiceVoidParams
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: {
          allocations: { where: { reversedAt: null } },
          creditNoteAllocations: { where: { reversedAt: null } },
        },
      })
      if (!invoice) return err('Invoice not found.', 404)
      if (invoice.status === 'DRAFT')
        return err('Delete a draft invoice instead of voiding it.', 409)
      if (invoice.status === 'VOID') return err('Invoice is already void.', 409)
      if (
        invoice.status === 'PAID' ||
        invoice.allocations.length > 0 ||
        invoice.creditNoteAllocations.length > 0
      )
        return err(
          'An invoice with settlements must be corrected with a credit note.',
          409
        )

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'VOID',
          amountDue: 0n,
          voidedAt: now,
          metadata: params.reason
            ? { voidReason: params.reason }
            : (invoice.metadata ?? undefined),
          updatedAt: now,
        },
      })
      await recordLedgerEntry(tx, {
        tenantId,
        customerId: invoice.customerId,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        type: 'INVOICE_VOIDED',
        direction: 'CREDIT',
        amount: invoice.amountDue,
        currency: invoice.currency,
        description: `Invoice ${invoice.number} voided`,
        idempotencyKey: `invoice:${invoice.id}:voided`,
        effectiveAt: now,
        createdAt: now,
      })
      await recomputeCustomerAr(tx, tenantId, invoice.customerId, now)

      return ok({ id: invoice.id })
    })

    return result
  } catch (error) {
    console.error('[billing.service.invoices.void]', error)
    return err('Failed to void the invoice.', 500)
  }
}
