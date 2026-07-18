import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type {
  BillingSweepParams,
  BillingSweepResult,
} from '@/types/subscription'

import { processDueAmendments } from './amendments'
import { billSubscription } from './bill'
import { processDueLifecycleSchedules } from './lifecycle'
import { enqueueSubscriptionNotification } from './notifications'

/** Processes a bounded batch of due subscriptions. Safe to call repeatedly. */
export async function processDueSubscriptions(
  tenantId: string,
  params: BillingSweepParams
): Promise<BillingSweepResult> {
  const asOf = params.asOf ?? nowUnixSeconds()
  await processDueAmendments(tenantId, asOf)
  await processDueLifecycleSchedules(tenantId, asOf)
  const preference = await prisma.subscriptionPreference.findUnique({
    where: { tenantId },
    select: {
      automateAdvanceBilling: true,
      advanceBillingMethod: true,
      consolidatedBillingEnabled: true,
      notifyAdvanceBillingFailure: true,
    },
  })
  const advanceDue =
    preference?.automateAdvanceBilling &&
    preference.advanceBillingMethod === 'INVOICE'
      ? await prisma.subscription.findMany({
          where: {
            tenantId,
            status: 'ACTIVE',
            nextAdvanceInvoiceAt: { lte: asOf },
            nextBillingAt: { gt: asOf },
            cancelAtPeriodEnd: false,
            amendments: { none: { status: 'PENDING' } },
            lifecycleSchedules: {
              none: {
                status: 'SCHEDULED',
                action: { in: ['PAUSE', 'CANCEL'] },
              },
            },
          },
          select: { id: true, nextBillingAt: true },
          orderBy: [{ nextAdvanceInvoiceAt: 'asc' }, { id: 'asc' }],
          take: params.limit,
        })
      : []
  const remainingLimit = Math.max(params.limit - advanceDue.length, 0)
  const due =
    remainingLimit > 0
      ? await prisma.subscription.findMany({
          where: {
            tenantId,
            status: { in: ['TRIALING', 'ACTIVE'] },
            nextBillingAt: { lte: asOf },
          },
          select: {
            id: true,
            customerId: true,
            collectionMethod: true,
            nextBillingAt: true,
            paymentTermId: true,
            taxBehavior: true,
            invoiceModeOverride: true,
            customer: { select: { consolidatedBillingOverride: true } },
            items: {
              where: { isActive: true },
              select: { currency: true },
              take: 1,
            },
          },
          orderBy: [{ nextBillingAt: 'asc' }, { id: 'asc' }],
          take: remainingLimit,
        })
      : []
  const summary: BillingSweepResult = {
    object: 'billing_run_summary',
    asOf,
    processed: advanceDue.length + due.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    invoiceIds: [],
  }

  for (const subscription of advanceDue) {
    try {
      const result = await billSubscription(tenantId, subscription.id, asOf, {
        advance: true,
      })
      if (result.status === 'skipped') summary.skipped += 1
      else summary.succeeded += 1
      if (result.invoiceId) summary.invoiceIds.push(result.invoiceId)
    } catch (error) {
      summary.failed += 1
      console.error('[billing.service.subscriptions.advance-bill]', {
        subscriptionId: subscription.id,
        error,
      })
      if (preference?.notifyAdvanceBillingFailure ?? true)
        try {
          await enqueueSubscriptionNotification(prisma, {
            tenantId,
            subscriptionId: subscription.id,
            invoiceId: null,
            type: 'ADVANCE_BILLING_FAILED',
            dedupeKey: `advance-failure:${subscription.id}:${subscription.nextBillingAt}`,
            payload: {
              subscriptionId: subscription.id,
              scheduledFor: subscription.nextBillingAt,
              message:
                error instanceof Error ? error.message.slice(0, 1_000) : null,
            },
            createdAt: asOf,
          })
        } catch (notificationError) {
          console.error('[billing.service.subscriptions.notification-outbox]', {
            subscriptionId: subscription.id,
            error: notificationError,
          })
        }
    }
  }

  const groups = new Map<string, typeof due>()
  for (const subscription of due) {
    const consolidated =
      subscription.collectionMethod === 'SEND_INVOICE' &&
      (subscription.customer.consolidatedBillingOverride ??
        preference?.consolidatedBillingEnabled ??
        false)
    const currency = subscription.items[0]?.currency
    const key =
      consolidated && currency
        ? [
            subscription.customerId,
            currency,
            subscription.nextBillingAt,
            subscription.paymentTermId,
            subscription.taxBehavior,
            subscription.invoiceModeOverride,
          ].join(':')
        : subscription.id
    const group = groups.get(key) ?? []
    group.push(subscription)
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    let consolidationInvoiceId: string | undefined
    for (const subscription of group) {
      try {
        const result = await billSubscription(
          tenantId,
          subscription.id,
          asOf,
          consolidationInvoiceId
            ? { consolidateWithInvoiceId: consolidationInvoiceId }
            : {}
        )
        if (result.status === 'skipped') summary.skipped += 1
        else summary.succeeded += 1
        if (result.invoiceId && !summary.invoiceIds.includes(result.invoiceId))
          summary.invoiceIds.push(result.invoiceId)
        if (!consolidationInvoiceId && group.length > 1 && result.invoiceId) {
          const invoice = await prisma.invoice.findUnique({
            where: { id: result.invoiceId },
            select: { status: true },
          })
          if (
            invoice &&
            ['DRAFT', 'OPEN', 'SENT', 'PARTIALLY_PAID'].includes(invoice.status)
          )
            consolidationInvoiceId = result.invoiceId
        }
      } catch (error) {
        summary.failed += 1
        console.error('[billing.service.subscriptions.bill]', {
          subscriptionId: subscription.id,
          error,
        })
      }
    }
  }

  await prisma.invoice.updateMany({
    where: {
      tenantId,
      dueAt: { lt: asOf },
      amountDue: { gt: 0n },
      status: { in: ['OPEN', 'SENT', 'PARTIALLY_PAID'] },
    },
    data: { status: 'OVERDUE', updatedAt: asOf },
  })

  return summary
}

/** Runs one bounded billing sweep for every tenant with due subscriptions. */
export async function processAllDueSubscriptions(params: BillingSweepParams) {
  const asOf = params.asOf ?? nowUnixSeconds()
  const tenants = await prisma.subscription.findMany({
    where: {
      status: { in: ['TRIALING', 'ACTIVE'] },
      OR: [
        { nextBillingAt: { lte: asOf } },
        {
          nextAdvanceInvoiceAt: { lte: asOf },
          nextBillingAt: { gt: asOf },
        },
      ],
      tenant: { status: 'ACTIVE' },
    },
    select: { tenantId: true },
    distinct: ['tenantId'],
    orderBy: { tenantId: 'asc' },
  })
  const results = []
  for (const tenant of tenants)
    results.push(
      await processDueSubscriptions(tenant.tenantId, {
        asOf,
        limit: params.limit,
      })
    )

  return {
    object: 'billing_engine_run' as const,
    asOf,
    tenants: results.length,
    processed: results.reduce((sum, result) => sum + result.processed, 0),
    succeeded: results.reduce((sum, result) => sum + result.succeeded, 0),
    failed: results.reduce((sum, result) => sum + result.failed, 0),
    skipped: results.reduce((sum, result) => sum + result.skipped, 0),
    invoiceIds: results.flatMap((result) => result.invoiceIds),
  }
}
