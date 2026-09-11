import { nowUnixSeconds } from '@876/core/timestamps'

import { claimCommand, completeCommand } from '@/modules/command-idempotency'
import { recomputeCustomerAr } from '@/modules/customers'
import { consume as consumeInventory } from '@/modules/inventory'
import { recordLedgerEntry } from '@/modules/ledger'
import { enqueueBillingEvent } from '@/modules/outbox'
import { isRetryableTransactionError } from '@/platform/prisma-errors'
import type { IdempotencyContext } from '@/types/commerce'
import type { Prisma } from '@/db'
import type { PaymentTermRule } from '@/db'

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

type FinalizableInvoice = {
  id: string
  customerId: string
  subscriptionId: string | null
  number: string
  currency: string
  totalAmount: bigint
  issueAt: number | null
  dueAt: number | null
  billingReason: 'OPENING_BALANCE' | string
  lines: Array<{
    itemId: string | null
    variantId: string | null
    quantity: number
  }>
}

export async function applyInvoiceFinalizeEffects(
  tx: Prisma.TransactionClient,
  tenantId: string,
  params: {
    invoice: FinalizableInvoice
    paymentTerm: {
      id: string
      name: string
      rule: PaymentTermRule
      dueDays: number
    } | null
    salesperson: { id: string; name: string } | null
    autoApplyCredits: boolean
    now: number
    ledgerDescription?: string
  }
): Promise<ServiceResult<null>> {
  const { invoice, paymentTerm, salesperson, autoApplyCredits, now } = params
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
    description:
      params.ledgerDescription ?? `Invoice ${invoice.number} finalized`,
    idempotencyKey: `invoice:${invoice.id}:finalized`,
    effectiveAt: issueAt,
    createdAt: now,
  })

  if (autoApplyCredits && invoice.totalAmount > 0n)
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
  await enqueueBillingEvent(tx, tenantId, {
    type: 'invoice.finalized',
    version: 1,
    resource: { type: 'invoice', id: invoice.id },
    payload: {
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      number: invoice.number,
      currency: invoice.currency,
      totalAmount: invoice.totalAmount.toString(),
      finalizedAt: now,
      issueAt,
      dueAt,
    },
    occurredAt: now,
  })

  return ok(null)
}

/** Shared transaction-scoped finalization used by manual and scheduled invoices. */
export async function finalizeInvoiceInTransaction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  invoiceId: string,
  params: InvoiceFinalizeParams,
  now: number
): Promise<ServiceResult<{ id: string }>> {
  const invoice = await findInvoiceForFinalize(tx, tenantId, invoiceId)
  if (!invoice) return err('Invoice not found.', 404)
  if (invoice.status !== 'DRAFT')
    return err('Only a draft invoice can be finalized.', 409)

  const paymentTermId = params.paymentTermId ?? invoice.paymentTermId
  const salespersonId =
    params.salespersonId ??
    invoice.salespersonId ??
    invoice.customer.salespersonId
  const [paymentTerm, salesperson] = await Promise.all([
    findPaymentTerm(tx, tenantId, paymentTermId),
    findSalesperson(tx, tenantId, salespersonId),
  ])
  if (paymentTermId && !paymentTerm) return err('Payment term not found.', 404)
  if (salespersonId && !salesperson) return err('Salesperson not found.', 404)

  const effects = await applyInvoiceFinalizeEffects(tx, tenantId, {
    invoice,
    paymentTerm,
    salesperson,
    autoApplyCredits: params.autoApplyCredits,
    now,
  })
  if (effects.error !== null) return effects
  return ok({ id: invoice.id })
}

/**
 * Application workflow for the Invoice -> financial/inventory side effects.
 * Persistence stays in owning repositories; cross-domain effects use public
 * module APIs.
 */
export async function finalizeInvoiceWorkflow(
  tenantId: string,
  invoiceId: string,
  params: InvoiceFinalizeParams,
  idempotency?: IdempotencyContext
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    const workflowResult = await runInvoiceTransaction(async (tx) => {
      let claimId: string | undefined
      if (idempotency) {
        const claim = await claimCommand(tx, tenantId, {
          operation: 'invoice-finalize',
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

      const finalized = await finalizeInvoiceInTransaction(
        tx,
        tenantId,
        invoiceId,
        params,
        now
      )
      if (finalized.error !== null) return finalized

      if (claimId) await completeCommand(tx, tenantId, claimId, now)
      return null
    })

    if (workflowResult) return workflowResult
    return ok({ id: invoiceId })
  } catch (error) {
    if (error instanceof InvoiceFinalizeError)
      return err(error.message, error.status)
    if (isRetryableTransactionError(error))
      return err(
        'Invoice balances or item stock changed; retry finalizing.',
        409
      )

    console.error('[billing.workflow.invoices.finalize]', error)
    return err('Failed to finalize the invoice.', 500)
  }
}
