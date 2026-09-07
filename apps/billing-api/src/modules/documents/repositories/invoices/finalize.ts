import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import type { InvoiceFinalizeParams } from '../../schemas/invoice'
import type { ServiceResult } from '../../schemas/api'

import { applyInvoiceStock } from '@/modules/catalog'
import { recomputeCustomerAr } from '@/modules/customers'
import { recordLedgerEntry } from '@/modules/ledger'
import { resolveDueAt } from '../payment-terms'
import { err, ok } from '../result'
import { settleWithAvailableCredits } from './settlement'
import { isRetryableTransactionError } from '@/platform/prisma-errors'

class InvoiceFinalizeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/** Finalizes a draft invoice, consumes tracked stock, and creates its AR position. */
export async function finalize(
  tenantId: string,
  invoiceId: string,
  params: InvoiceFinalizeParams
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    const stockError = await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findFirst({
          where: { id: invoiceId, tenantId },
          include: {
            customer: { select: { salespersonId: true } },
            lines: { select: { itemId: true, quantity: true } },
          },
        })
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
          paymentTermId
            ? tx.paymentTerm.findFirst({
                where: { id: paymentTermId, tenantId, isActive: true },
              })
            : tx.paymentTerm.findFirst({
                where: {
                  tenantId,
                  rule: 'DUE_ON_RECEIPT',
                  isActive: true,
                },
                orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
              }),
          salespersonId
            ? tx.salesperson.findFirst({
                where: { id: salespersonId, tenantId, isActive: true },
              })
            : null,
        ])
        if (paymentTermId && !paymentTerm)
          throw new InvoiceFinalizeError('Payment term not found.', 404)
        if (salespersonId && !salesperson)
          throw new InvoiceFinalizeError('Salesperson not found.', 404)

        const stock = await applyInvoiceStock(
          tx,
          tenantId,
          invoice.id,
          invoice.lines,
          now
        )
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

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status,
            issueAt,
            dueAt,
            finalizedAt: now,
            paidAt: status === 'PAID' ? now : null,
            paymentTermId: paymentTerm?.id ?? null,
            paymentTermName: paymentTerm?.name ?? null,
            salespersonId: salesperson?.id ?? null,
            salespersonName: salesperson?.name ?? null,
            updatedAt: now,
          },
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
      },
      { isolationLevel: 'Serializable' }
    )

    if (stockError) return stockError
    return ok({ id: invoiceId })
  } catch (error) {
    if (error instanceof InvoiceFinalizeError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Invoice balances or item stock changed; retry finalizing.', 409)

    console.error('[billing.service.invoices.finalize]', error)
    return err('Failed to finalize the invoice.', 500)
  }
}
