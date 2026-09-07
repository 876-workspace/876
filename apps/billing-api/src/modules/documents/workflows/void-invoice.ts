import { nowUnixSeconds } from '@876/core/timestamps'

import {
  claimCommand,
  completeCommand,
} from '@/modules/command-idempotency'
import { recomputeCustomerAr } from '@/modules/customers'
import { restore as restoreInventory } from '@/modules/inventory'
import { recordLedgerEntry } from '@/modules/ledger'
import { enqueueBillingEvent } from '@/modules/outbox'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import {
  findInvoiceForVoid,
  markInvoiceVoid,
  runInvoiceTransaction,
} from '../repositories/invoice-workflow'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { InvoiceVoidParams } from '../schemas/invoice'

/** Application workflow for voiding an unsettled finalized invoice. */
export async function voidInvoiceWorkflow(
  tenantId: string,
  invoiceId: string,
  params: InvoiceVoidParams,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    return await runInvoiceTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'invoice-void',
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          resource: { type: 'invoice', id: invoiceId },
          httpStatus: 201,
          now,
        })
        if (claim.error !== null) return claim
        if (claim.data.state === 'replayed') return ok({ id: invoiceId })
        claimId = claim.data.claimId
      }

      const invoice = await findInvoiceForVoid(tx, tenantId, invoiceId)
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

      const stock = await restoreInventory(tx, tenantId, {
        reference: { type: 'invoice', id: invoice.id },
        reason: 'sale',
        occurredAt: now,
      })
      if (stock.error !== null) return stock

      const amountReversed = invoice.amountDue
      await markInvoiceVoid(tx, {
        id: invoice.id,
        now,
        reason: params.reason,
        metadata: invoice.metadata,
      })
      await recordLedgerEntry(tx, {
        tenantId,
        customerId: invoice.customerId,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        type: 'INVOICE_VOIDED',
        direction: 'CREDIT',
        amount: amountReversed,
        currency: invoice.currency,
        description: `Invoice ${invoice.number} voided`,
        idempotencyKey: `invoice:${invoice.id}:voided`,
        effectiveAt: now,
        createdAt: now,
      })
      await recomputeCustomerAr(tx, tenantId, invoice.customerId, now)
      await enqueueBillingEvent(tx, tenantId, {
        type: 'invoice.voided',
        version: 1,
        resource: { type: 'invoice', id: invoice.id },
        payload: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          number: invoice.number,
          currency: invoice.currency,
          amountReversed: amountReversed.toString(),
          voidedAt: now,
        },
        occurredAt: now,
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: invoice.id })
    })
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('Invoice balances or item stock changed; retry voiding.', 409)

    console.error('[billing.workflow.invoices.void]', error)
    return err('Failed to void the invoice.', 500)
  }
}
