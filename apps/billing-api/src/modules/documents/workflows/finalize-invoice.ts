import { nowUnixSeconds } from '@876/core/timestamps'

import { recomputeCustomerAr } from '@/modules/customers'
import { consume as consumeInventory } from '@/modules/inventory'
import { recordLedgerEntry } from '@/modules/ledger'
import { isRetryableTransactionError } from '@/platform/prisma-errors'

import {
  findInvoiceForFinalize,
  findPaymentTerm,
  findSalesperson,
  markInvoiceFinalized,
  runInvoiceTransaction,
} from '../repositories/invoice-workflow'
import { resolveDueAt } from '../repositories/payment-terms'
import { settleWithAvailableCredits } from '../repositories/invoices/settlement'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { InvoiceFinalizeParams } from '../schemas/invoice'

class InvoiceFinalizeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/**
 * Application workflow for the Invoice -> financial/inventory side effects.
 * Persistence stays in owning repositories; cross-domain effects use public
 * module APIs.
 */
export async function finalizeInvoiceWorkflow(
  tenantId: string,
  invoiceId: string,
  params: InvoiceFinalizeParams
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    const stockError = await runInvoiceTransaction(async (tx) => {
      const invoice = await findInvoiceForFinalize(tx, tenantId, invoiceId)
      if (!invoice) throw new InvoiceFinalizeError('Invoice not found.', 404)
      if (invoice.status !== 'DRAFT')
        throw new InvoiceFinalizeError(
          'Only a draft invoice can be finalized.',
          409
        )

      const paymentTermId = params.paymentTermId ?? invoice.paymentTermId
      const salespersonId =
        params.salespersonId ??
        invoice.salespersonId ??
        invoice.customer.salespersonId
      const [paymentTerm, salesperson] = await Promise.all([
        findPaymentTerm(tx, tenantId, paymentTermId),
        findSalesperson(tx, tenantId, salespersonId),
      ])
      if (paymentTermId && !paymentTerm)
        throw new InvoiceFinalizeError('Payment term not found.', 404)
      if (salespersonId && !salesperson)
        throw new InvoiceFinalizeError('Salesperson not found.', 404)

      const stock = await consumeInventory(tx, tenantId, {
        reference: { type: 'invoice', id: invoice.id },
        reason: 'sale',
        lines: invoice.lines.flatMap((line) => {
          const target = line.variantId
            ? ({ type: 'variant', id: line.variantId } as const)
            : line.itemId
              ? ({ type: 'item', id: line.itemId } as const)
              : null
          return target ? [{ target, quantity: line.quantity }] : []
        }),
        occurredAt: now,
      })
      if (stock.error !== null) return stock

      const issueAt = invoice.issueAt ?? now
      const dueAt =
        invoice.dueAt ??
        (paymentTerm?.rule === 'DUE_ON_RECEIPT'
          ? now
          : paymentTerm
            ? resolveDueAt(issueAt, paymentTerm)
            : now)
      const status = invoice.totalAmount === 0n ? 'PAID' : 'OPEN'

      await markInvoiceFinalized(tx, {
        id: invoice.id,
        status,
        issueAt,
        dueAt,
        finalizedAt: now,
        paymentTermId: paymentTerm?.id ?? null,
        paymentTermName: paymentTerm?.name ?? null,
        salespersonId: salesperson?.id ?? null,
        salespersonName: salesperson?.name ?? null,
      })

      await recordLedgerEntry(tx, {
        tenantId,
        customerId: invoice.customerId,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        type:
          invoice.billingReason === 'OPENING_BALANCE'
            ? 'OPENING_BALANCE'
            : 'INVOICE_FINALIZED',
        direction: 'DEBIT',
        amount: invoice.totalAmount,
        currency: invoice.currency,
        description: `Invoice ${invoice.number} finalized`,
        idempotencyKey: `invoice:${invoice.id}:finalized`,
        effectiveAt: issueAt,
        createdAt: now,
      })

      if (params.autoApplyCredits && invoice.totalAmount > 0n)
        await settleWithAvailableCredits(
          tx,
          {
            id: invoice.id,
            tenantId,
            customerId: invoice.customerId,
            subscriptionId: invoice.subscriptionId,
            number: invoice.number,
            currency: invoice.currency,
            status: 'OPEN',
            amountDue: invoice.totalAmount,
            paidAt: null,
          },
          now
        )

      await recomputeCustomerAr(tx, tenantId, invoice.customerId, now)
      return null
    })

    if (stockError) return stockError
    return ok({ id: invoiceId })
  } catch (error) {
    if (error instanceof InvoiceFinalizeError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Invoice balances or item stock changed; retry finalizing.', 409)

    console.error('[billing.workflow.invoices.finalize]', error)
    return err('Failed to finalize the invoice.', 500)
  }
}
