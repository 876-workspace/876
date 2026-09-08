import { nowUnixSeconds } from '@876/core/timestamps'

import {
  claimCommand,
  completeCommand,
} from '@/modules/command-idempotency'
import { enqueueBillingEvent } from '@/modules/outbox'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import {
  findInvoiceForSend,
  markInvoiceSent,
  runInvoiceTransaction,
} from '../repositories/invoice-workflow'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'

const sendableStatuses = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
] as const

type SendableStatus = (typeof sendableStatuses)[number]

function isSendableStatus(status: string): status is SendableStatus {
  return sendableStatuses.some((candidate) => candidate === status)
}

/** Records invoice communication without replacing its financial state. */
export async function sendInvoiceWorkflow(
  tenantId: string,
  invoiceId: string,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    return await runInvoiceTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'invoice-send',
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

      const invoice = await findInvoiceForSend(tx, tenantId, invoiceId)
      if (!invoice) return err('Invoice not found.', 404)
      if (!isSendableStatus(invoice.status))
        return err(
          'Only a finalized invoice that is not void or written off can be marked sent.',
          409
        )

      await markInvoiceSent(tx, {
        id: invoice.id,
        status: invoice.status,
        sentAt: invoice.sentAt,
        now,
      })
      await enqueueBillingEvent(tx, tenantId, {
        type: 'invoice.sent',
        version: 1,
        resource: { type: 'invoice', id: invoice.id },
        payload: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          number: invoice.number,
          currency: invoice.currency,
          sentAt: now,
        },
        occurredAt: now,
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: invoice.id })
    })
  } catch (error) {
    if (isRetryableTransactionError(error))
      return err('Invoice state changed; retry sending.', 409)

    console.error('[billing.workflow.invoices.send]', error)
    return err('Failed to record the invoice send.', 500)
  }
}
