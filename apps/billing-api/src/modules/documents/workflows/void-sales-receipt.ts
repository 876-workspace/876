import { nowUnixSeconds } from '@876/core/timestamps'

import {
  claimCommand,
  completeCommand,
} from '@/modules/command-idempotency'
import { restore as restoreInventory } from '@/modules/inventory'
import { enqueueBillingEvent } from '@/modules/outbox'
import {
  reverseSettledPayment,
  SettledPaymentReversalError,
} from '@/modules/payments'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import {
  findSalesReceiptForVoid,
  markSalesReceiptVoid,
  runSalesReceiptTransaction,
} from '../repositories/sales-receipt-workflow'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { SalesReceiptVoidParams } from '../schemas/sales-receipt'

/**
 * Reverses an incorrectly recorded immediate sale. Real returns/refunds must use
 * credit/refund workflows so the historical sale remains visible.
 */
export async function voidSalesReceiptWorkflow(
  tenantId: string,
  salesReceiptId: string,
  params: SalesReceiptVoidParams,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    return await runSalesReceiptTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'sales-receipt-void',
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          resource: { type: 'sales-receipt', id: salesReceiptId },
          httpStatus: 201,
          now,
        })
        if (claim.error !== null) return claim
        if (claim.data.state === 'replayed') return ok({ id: salesReceiptId })
        claimId = claim.data.claimId
      }

      const receipt = await findSalesReceiptForVoid(
        tx,
        tenantId,
        salesReceiptId
      )
      if (!receipt) return err('Sales Receipt not found.', 404)
      if (receipt.status === 'VOID')
        return err('Sales Receipt is already void.', 409)
      if (receipt.creditNotes.length > 0 || receipt.payment.refunds.length > 0)
        return err(
          'A Sales Receipt with return or refund evidence cannot be voided.',
          409
        )

      await reverseSettledPayment(
        tx,
        tenantId,
        receipt.paymentId,
        now
      )

      const stock = await restoreInventory(tx, tenantId, {
        reference: { type: 'sales-receipt', id: receipt.id },
        reason: 'sale',
        occurredAt: now,
      })
      if (stock.error !== null) return stock

      await markSalesReceiptVoid(
        tx,
        tenantId,
        receipt.id,
        params.reason ?? null,
        now
      )

      await enqueueBillingEvent(tx, tenantId, {
        type: 'sales-receipt.voided',
        version: 1,
        resource: { type: 'sales-receipt', id: receipt.id },
        payload: {
          salesReceiptId: receipt.id,
          customerId: receipt.customerId,
          paymentId: receipt.paymentId,
          number: receipt.number,
          currency: receipt.currency,
          amountReversed: receipt.totalAmount.toString(),
          voidedAt: now,
        },
        occurredAt: now,
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: receipt.id })
    })
  } catch (error) {
    if (error instanceof SettledPaymentReversalError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Payment or item stock changed; retry voiding.', 409)

    console.error('[billing.workflow.sales-receipts.void]', error)
    return err('Failed to void the Sales Receipt.', 500)
  }
}
