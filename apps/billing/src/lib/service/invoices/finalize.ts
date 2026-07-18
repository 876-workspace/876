import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { InvoiceFinalizeParams } from '@/types/invoice'
import type { ServiceResult } from '@/types/api'

import { recomputeCustomerAr } from '../customers/ar'
import { recordLedgerEntry } from '../ledger'
import { resolveDueAt } from '../payment-terms'
import { err, ok } from '../result'
import { isRetryableTransactionError } from '../payments/shared'
import { settleWithAvailableCredits } from './settlement'

class InvoiceFinalizeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/** Finalizes a draft invoice and creates its accounts-receivable position. */
export async function finalize(
  tenantId: string,
  invoiceId: string,
  params: InvoiceFinalizeParams
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findFirst({
          where: { id: invoiceId, tenantId },
          include: {
            customer: { select: { salespersonId: true } },
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
      },
      { isolationLevel: 'Serializable' }
    )

    return ok({ id: invoiceId })
  } catch (error) {
    if (error instanceof InvoiceFinalizeError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err('Invoice balances changed; retry finalizing the invoice.', 409)

    console.error('[billing.service.invoices.finalize]', error)
    return err('Failed to finalize the invoice.', 500)
  }
}
