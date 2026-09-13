import { nowUnixSeconds } from '@876/core/timestamps'

import { AppHttpError, appError } from '@/http/errors'
import { claimCommand, completeCommand } from '@/modules/command-idempotency'
import { generateId } from '@/platform/ids'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'

import { nextDocumentNumber } from '../document-numbers.repository'
import {
  lockSalesOrderForInvoice,
  runSalesOrderTransaction,
} from '../repositories/sales-orders'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'

/**
 * Creates a draft Invoice from the Sales Order snapshots. Live catalog pricing
 * is deliberately not resolved again: the Invoice bills the commercial facts
 * that were agreed on the order.
 */
export async function convertSalesOrderToInvoiceWorkflow(
  tenantId: string,
  salesOrderId: string,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string; replayed?: true }> {
  const now = nowUnixSeconds()
  const invoiceId = generateId('Invoice')

  try {
    return await runSalesOrderTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'sales-order-convert-to-invoice',
          key: idempotency.key,
          requestHash: idempotency.requestHash,
          resource: { type: 'invoice', id: invoiceId },
          httpStatus: 201,
          now,
        })
        if (claim.error !== null)
          return err(claim.error, claim.status, claim.code)
        if (claim.data.state === 'replayed')
          return ok({ id: claim.data.resource.id, replayed: true })
        claimId = claim.data.claimId
      }

      const order = await lockSalesOrderForInvoice(tx, tenantId, salesOrderId)
      if (!order) throw appError('billing/sales-order-not-found')
      if (order.status !== 'CONFIRMED')
        throw appError('billing/sales-order-invalid-state')
      if (order.invoices[0])
        throw appError('billing/sales-order-already-invoiced')

      const number = await nextDocumentNumber(tenantId, 'INVOICE', now, tx)
      await tx.invoice.create({
        data: {
          id: invoiceId,
          tenantId,
          customerId: order.customerId,
          priceListId: order.priceListId,
          priceListName: order.priceListName,
          salesOrderId: order.id,
          salespersonId: order.salespersonId,
          salespersonName: order.salespersonName,
          number,
          status: 'DRAFT',
          billingReason: 'SALES_ORDER',
          currency: order.currency,
          orderNumber: order.number,
          referenceNumber: order.referenceNumber,
          taxBehavior: order.taxBehavior,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          billingAddressSnapshot: order.billingAddressSnapshot ?? undefined,
          shippingAddressSnapshot: order.shippingAddressSnapshot ?? undefined,
          issueAt: now,
          subtotalAmount: order.subtotalAmount,
          taxAmount: order.taxAmount,
          discountAmount: 0n,
          totalAmount: order.totalAmount,
          amountDue: order.totalAmount,
          notes: order.notes,
          terms: order.terms,
          createdAt: now,
          updatedAt: now,
          lines: {
            create: order.lines.map((line) => ({
              id: generateId('InvoiceLine'),
              itemId: line.itemId,
              variantId: line.variantId,
              variantName: line.variantName,
              variantSku: line.variantSku,
              priceId: line.priceId,
              taxRateId: line.taxRateId,
              description: line.description,
              unit: line.unit,
              position: line.position,
              quantity: line.quantity,
              unitAmount: line.unitAmount,
              taxAmount: line.taxAmount,
              taxName: line.taxName,
              taxRate: line.taxRate,
              taxInclusive: line.taxInclusive,
              discountAmount: line.discountAmount,
              totalAmount: line.totalAmount,
              createdAt: now,
              updatedAt: now,
            })),
          },
        },
      })

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return ok({ id: invoiceId })
    })
  } catch (error) {
    if (error instanceof AppHttpError)
      return err(error.message, error.httpStatus, error.code)
    if (isRetryableTransactionError(error))
      return err(
        'The Sales Order invoice conversion changed while it was running; retry.',
        409,
        'billing/sales-order-already-invoiced'
      )

    console.error('[billing.workflow.sales-orders.convert-to-invoice]', error)
    return err('Failed to convert the Sales Order to an invoice.', 500)
  }
}
