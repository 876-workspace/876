import type { PrismaTransaction } from '@/lib/db'

import { recomputeCustomerAr } from '../customers/ar'
import { recordLedgerEntry } from '../ledger'

export class AdvanceInvoiceConflict extends Error {}

/**
 * Invalidates unsettled future-period invoices before a commercial change.
 * Settled documents are blocked so payments and credits cannot be orphaned.
 */
export async function invalidateAdvanceInvoices(
  tx: PrismaTransaction,
  tenantId: string,
  subscriptionId: string,
  now: number,
  reason: string
) {
  const runs = await tx.subscriptionBillingRun.findMany({
    where: {
      tenantId,
      subscriptionId,
      isAdvanceBilling: true,
      periodAdvancedAt: null,
      status: 'SUCCEEDED',
      invoiceId: { not: null },
    },
    include: {
      invoice: {
        include: {
          allocations: { where: { reversedAt: null } },
          creditNoteAllocations: { where: { reversedAt: null } },
          subscriptionLinks: { select: { subscriptionId: true } },
        },
      },
    },
  })

  for (const run of runs) {
    const invoice = run.invoice
    if (!invoice) continue
    if (invoice.subscriptionLinks.length > 1)
      throw new AdvanceInvoiceConflict(
        'This advance invoice contains multiple subscriptions and must be corrected before changing the subscription.'
      )
    if (
      invoice.allocations.length > 0 ||
      invoice.creditNoteAllocations.length > 0 ||
      invoice.amountPaid > 0n ||
      invoice.amountCredited > 0n
    )
      throw new AdvanceInvoiceConflict(
        'The advance invoice has payments or credits. Reverse those settlements before changing the subscription.'
      )

    await tx.subscriptionCharge.updateMany({
      where: { subscriptionId, invoiceId: invoice.id, status: 'INVOICED' },
      data: {
        status: 'UNBILLED',
        invoiceId: null,
        invoicedAt: null,
        updatedAt: now,
      },
    })
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'VOID',
        amountDue: 0n,
        voidedAt: now,
        metadata: { advanceInvoiceInvalidated: true, voidReason: reason },
        updatedAt: now,
      },
    })
    if (invoice.status !== 'DRAFT' && invoice.amountDue > 0n)
      await recordLedgerEntry(tx, {
        tenantId,
        customerId: invoice.customerId,
        subscriptionId,
        invoiceId: invoice.id,
        type: 'INVOICE_VOIDED',
        direction: 'CREDIT',
        amount: invoice.amountDue,
        currency: invoice.currency,
        description: `Advance invoice ${invoice.number} invalidated`,
        idempotencyKey: `invoice:${invoice.id}:advance-invalidated`,
        effectiveAt: now,
        createdAt: now,
      })
    await tx.subscriptionBillingRun.delete({ where: { id: run.id } })
    await recomputeCustomerAr(tx, tenantId, invoice.customerId, now)
  }
  if (runs.length > 0)
    await restoreAdvanceInvoiceSchedules(
      tx,
      [...new Set(runs.map((run) => run.subscriptionId))],
      now
    )
}

/** Restores automatic advance generation after a future invoice is released. */
export async function restoreAdvanceInvoiceSchedules(
  tx: PrismaTransaction,
  subscriptionIds: string[],
  asOf: number
) {
  if (subscriptionIds.length === 0) return
  const subscriptions = await tx.subscription.findMany({
    where: { id: { in: subscriptionIds }, deletedAt: null },
    select: {
      id: true,
      status: true,
      nextBillingAt: true,
      advanceBillingEnabled: true,
      advanceBillingDays: true,
    },
  })
  for (const subscription of subscriptions) {
    const nextAdvanceInvoiceAt =
      subscription.status === 'ACTIVE' &&
      subscription.advanceBillingEnabled &&
      subscription.advanceBillingDays &&
      subscription.nextBillingAt !== null &&
      subscription.nextBillingAt > asOf
        ? Math.max(
            asOf,
            subscription.nextBillingAt -
              subscription.advanceBillingDays * 86_400
          )
        : null
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { nextAdvanceInvoiceAt, updatedAt: asOf },
    })
  }
}
