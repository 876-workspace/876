import { nowUnixSeconds } from '@876/core/timestamps'

import {
  claimCommand,
  completeCommand,
} from '@/modules/command-idempotency'
import { recomputeCustomerAr } from '@/modules/customers'
import { isCollectibleInvoiceStatus } from '@/modules/documents'
import { recordLedgerEntry } from '@/modules/ledger'
import { enqueueBillingEvent } from '@/modules/outbox'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import {
  findInvoiceForWriteOff,
  markInvoiceWrittenOff,
  runInvoiceTransaction,
} from '../repositories/invoice-workflow'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { InvoiceWriteOffParams } from '../schemas/invoice'

/** Writes off the full remaining receivable without reversing the sale. */
export async function writeOffInvoiceWorkflow(
  tenantId: string,
  invoiceId: string,
  params: InvoiceWriteOffParams,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    return await runInvoiceTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'invoice-write-off',
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          resource: { type: 'invoice', id: invoiceId },
          httpStatus: 200,
          now,
        })
        if (claim.error !== null) return claim
        if (claim.data.state === 'replayed') return ok({ id: invoiceId })
        claimId = claim.data.claimId
      }

      const invoice = await findInvoiceForWriteOff(tx, tenantId, invoiceId)
      if (!invoice) return err('Invoice not found.', 404)
      if (!isCollectibleInvoiceStatus(invoice.status) || invoice.amountDue <= 0n)
        return err('Only an invoice with an open balance can be written off.', 409)

      const amountWrittenOff = invoice.amountDue
      await markInvoiceWrittenOff(tx, {
        id: invoice.id,
        amount: amountWrittenOff,
        now,
        reason: params.reason,
        metadata: invoice.metadata,
      })
      await recordLedgerEntry(tx, {
        tenantId,
        customerId: invoice.customerId,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        type: 'WRITE_OFF',
        direction: 'CREDIT',
        amount: amountWrittenOff,
        currency: invoice.currency,
        description: `Invoice ${invoice.number} written off`,
        idempotencyKey: `invoice:${invoice.id}:write-off`,
        effectiveAt: now,
        createdAt: now,
      })
      await recomputeCustomerAr(tx, tenantId, invoice.customerId, now)
      await enqueueBillingEvent(tx, tenantId, {
        type: 'invoice.written-off',
        version: 1,
        resource: { type: 'invoice', id: invoice.id },
        payload: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          number: invoice.number,
          currency: invoice.currency,
          amountWrittenOff: amountWrittenOff.toString(),
          reason: params.reason,
          writtenOffAt: now,
        },
        occurredAt: now,
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: invoice.id })
    })
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('Invoice balance changed; retry writing it off.', 409)

    console.error('[billing.workflow.invoices.write-off]', error)
    return err('Failed to write off the invoice.', 500)
  }
}
