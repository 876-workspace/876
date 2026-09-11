import { nowUnixSeconds } from '@876/core/timestamps'

import {
  claimCommand,
  completeCommand,
} from '@/modules/command-idempotency'
import { returnStock } from '@/modules/inventory'
import { enqueueBillingEvent } from '@/modules/outbox'
import {
  createCreditNoteRefund,
  RefundMutationError,
} from '@/modules/payments'
import { generateId } from '@/platform/ids'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import { nextDocumentNumber } from '../document-numbers.repository'
import { recordCreditNote } from '../repositories/credit-notes/record'
import { computeTotals } from '../repositories/credit-notes/shared'
import { runSalesReceiptTransaction } from '../repositories/sales-receipt-workflow'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { SalesReceiptRefundParams } from '../schemas/sales-receipt'

class SalesReceiptRefundError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'SalesReceiptRefundError'
  }
}

/**
 * Corrects Sales Receipt value with a Credit Note and returns cash with a
 * Refund. Optional stock quantities are restored in the same transaction.
 */
export async function refundSalesReceiptWorkflow(
  tenantId: string,
  salesReceiptId: string,
  params: SalesReceiptRefundParams,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    return await runSalesReceiptTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'sales-receipt-refund',
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

      const receipt = await tx.salesReceipt.findFirst({
        where: { id: salesReceiptId, tenantId },
        include: {
          lines: true,
          payment: {
            select: {
              paymentModeId: true,
              depositAccountId: true,
            },
          },
          creditNotes: {
            where: { status: { not: 'VOID' } },
            select: { totalAmount: true },
          },
        },
      })
      if (!receipt) return err('Sales Receipt not found.', 404)
      if (receipt.status !== 'PAID')
        return err('Only a paid Sales Receipt can be refunded.', 409)

      const credited = receipt.creditNotes.reduce(
        (total, creditNote) => total + creditNote.totalAmount,
        0n
      )
      const remaining = receipt.totalAmount - credited
      if (params.amount > remaining)
        return err(
          'Refund exceeds the uncredited Sales Receipt amount.',
          422
        )

      const lineById = new Map(receipt.lines.map((line) => [line.id, line]))
      const stockLines = params.returnLines.map((requested) => {
        const line = lineById.get(requested.salesReceiptLineId)
        if (!line)
          throw new SalesReceiptRefundError(
            'One or more Sales Receipt return lines were not found.',
            404
          )
        if (requested.quantity > line.quantity)
          throw new SalesReceiptRefundError(
            'A return quantity cannot exceed the quantity sold on its Sales Receipt line.',
            422
          )
        const target = line.variantId
          ? ({ type: 'variant', id: line.variantId } as const)
          : line.itemId
            ? ({ type: 'item', id: line.itemId } as const)
            : null
        if (!target)
          throw new SalesReceiptRefundError(
            'Only Sales Receipt lines backed by tracked catalog items can restore stock.',
            422
          )
        return { target, quantity: requested.quantity }
      })

      if (stockLines.length > 0) {
        const stock = await returnStock(tx, tenantId, {
          reference: { type: 'sales-receipt', id: receipt.id },
          lines: stockLines,
          occurredAt: params.refundedAt ?? now,
        })
        if (stock.error !== null)
          throw new SalesReceiptRefundError(stock.error, stock.status ?? 422)
      }

      const [creditNoteNumber, refundNumber] = await Promise.all([
        nextDocumentNumber(tenantId, 'CREDIT_NOTE', now, tx),
        nextDocumentNumber(tenantId, 'REFUND', now, tx),
      ])
      const creditNoteId = generateId('CreditNote')
      const refundId = generateId('Refund')
      const refundedAt = params.refundedAt ?? now
      const totals = computeTotals([
        {
          description: `Return/refund for Sales Receipt ${receipt.number}`,
          quantity: 1,
          unitAmount: params.amount,
          taxAmount: 0n,
          discountAmount: 0n,
        },
      ])

      await recordCreditNote(tx, tenantId, {
        id: creditNoteId,
        customerId: receipt.customerId,
        salesReceiptId: receipt.id,
        number: creditNoteNumber,
        currency: receipt.currency,
        reason: params.reason,
        totals,
        notes: params.notes,
        issueAt: refundedAt,
        now,
      })

      await createCreditNoteRefund(tx, tenantId, {
        refundId,
        number: refundNumber,
        customerId: receipt.customerId,
        creditNoteId,
        paymentModeId:
          params.paymentModeId === undefined
            ? receipt.payment.paymentModeId
            : params.paymentModeId,
        depositAccountId:
          params.depositAccountId === undefined
            ? receipt.payment.depositAccountId
            : params.depositAccountId,
        amount: params.amount,
        currency: receipt.currency,
        reason: params.reason,
        notes: params.notes,
        refundedAt,
        now,
      })

      await enqueueBillingEvent(tx, tenantId, {
        type: 'sales-receipt.refunded',
        version: 1,
        resource: { type: 'sales-receipt', id: receipt.id },
        payload: {
          salesReceiptId: receipt.id,
          customerId: receipt.customerId,
          creditNoteId,
          refundId,
          currency: receipt.currency,
          amount: params.amount.toString(),
          returnedLineCount: params.returnLines.length,
          refundedAt,
        },
        occurredAt: now,
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: receipt.id })
    })
  } catch (error) {
    if (error instanceof SalesReceiptRefundError)
      return err(error.message, error.status)
    if (error instanceof RefundMutationError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Sales Receipt balances or item stock changed; retry the refund.', 409)

    console.error('[billing.workflow.sales-receipts.refund]', error)
    return err('Failed to refund the Sales Receipt.', 500)
  }
}
