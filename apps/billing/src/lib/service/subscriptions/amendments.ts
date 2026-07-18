import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransaction } from '@/lib/db'
import type { Prisma } from '@/lib/db/generated/prisma/client'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { SubscriptionAmendmentCreateParams } from '@/types/subscription'

import { err, ok } from '../result'
import { calculateProration } from '../billing-engine'
import { invoiceUnbilledCharges } from './charges'
import {
  resolveSubscriptionComposition,
  validateSubscriptionCatalogComposition,
} from './composition'
import { createSubscriptionCredit } from './credits'
import {
  AdvanceInvoiceConflict,
  invalidateAdvanceInvoices,
} from './advance-invoices'
import { addInterval } from './period'

export async function createAmendment(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionAmendmentCreateParams,
  actorUserId?: string
): ServiceResult<{ id: string; applied: boolean }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    select: {
      id: true,
      status: true,
      currentPeriodEnd: true,
      servicePeriodEnd: true,
      collectionMethod: true,
      billingTiming: true,
      paymentTermId: true,
      taxBehavior: true,
      invoiceModeOverride: true,
      renewalPricingPolicy: true,
      renewalAdjustmentPercent: true,
      billingCycleAnchor: true,
      remainingCycles: true,
    },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  if (subscription.status === 'PAUSED')
    return err('Resume the subscription before changing it.', 409)
  if (subscription.status === 'CANCELED' || subscription.status === 'ENDED')
    return err('An ended subscription cannot be changed.', 409)

  const priceIds = params.items.map((item) => item.priceId)
  if (new Set(priceIds).size !== priceIds.length)
    return err('A subscription cannot include the same price twice.', 422)
  const prices = await prisma.price.findMany({
    where: { tenantId, id: { in: priceIds }, isActive: true },
    include: {
      plan: {
        include: {
          addonAssociations: {
            where: { isActive: true, associationType: 'MANDATORY' },
            include: { addon: true },
          },
        },
      },
      addon: { include: { planAssociations: true } },
      item: true,
      tiers: true,
    },
  })
  if (prices.length !== priceIds.length)
    return err('One or more selected prices were not found.', 404)
  const composition = resolveSubscriptionComposition(prices)
  if (composition.error !== null) return err(composition.error, 422)
  const catalogError = validateSubscriptionCatalogComposition(
    prices,
    'PLAN_CHANGE'
  )
  if (catalogError) return err(catalogError, 422)

  const now = nowUnixSeconds()
  const effectiveAt =
    params.timing === 'IMMEDIATE'
      ? now
      : params.timing === 'END_OF_TERM'
        ? (subscription.servicePeriodEnd ?? subscription.currentPeriodEnd)
        : params.effectiveAt
  if (effectiveAt == null)
    return err('The subscription does not have an effective date.', 409)
  if (effectiveAt < now)
    return err('The effective date cannot be in the past.', 422)
  const changesBillingAnchor =
    params.billingCycleAnchor !== undefined &&
    params.billingCycleAnchor !== subscription.billingCycleAnchor
  if (
    changesBillingAnchor &&
    subscription.servicePeriodEnd !== null &&
    effectiveAt < subscription.servicePeriodEnd
  )
    return err(
      'Schedule billing-cycle anchor changes for the end of the current term or later.',
      422
    )
  if (
    changesBillingAnchor &&
    params.billingCycleAnchor !== undefined &&
    params.billingCycleAnchor !== null &&
    params.billingCycleAnchor < effectiveAt
  )
    return err('The billing-cycle anchor cannot precede the change date.', 422)

  const amendmentId = generateId('SubscriptionAmendment')
  const priceById = new Map(prices.map((price) => [price.id, price]))
  try {
    await prisma.$transaction(async (tx) => {
      await invalidateAdvanceInvoices(
        tx,
        tenantId,
        subscriptionId,
        now,
        'Subscription terms changed'
      )
      await tx.subscriptionAmendment.updateMany({
        where: { subscriptionId, status: 'PENDING' },
        data: { status: 'CANCELED', canceledAt: now, updatedAt: now },
      })
      await tx.subscriptionAmendment.create({
        data: {
          id: amendmentId,
          tenantId,
          subscriptionId,
          timing: params.timing,
          effectiveAt,
          status: effectiveAt <= now ? 'APPLIED' : 'PENDING',
          prorationBehavior: params.prorationBehavior,
          paymentFailureBehavior: params.paymentFailureBehavior,
          collectionMethod:
            params.collectionMethod ?? subscription.collectionMethod,
          billingTiming: params.billingTiming ?? subscription.billingTiming,
          paymentTermId:
            params.paymentTermId === undefined
              ? subscription.paymentTermId
              : params.paymentTermId,
          taxBehavior: params.taxBehavior ?? subscription.taxBehavior,
          invoiceModeOverride:
            params.invoiceModeOverride === undefined
              ? subscription.invoiceModeOverride
              : params.invoiceModeOverride,
          renewalPricingPolicy:
            params.renewalPricingPolicy ?? subscription.renewalPricingPolicy,
          renewalAdjustmentPercent:
            params.renewalAdjustmentPercent === undefined
              ? subscription.renewalAdjustmentPercent
              : params.renewalAdjustmentPercent,
          billingCycleAnchor:
            params.billingCycleAnchor === undefined
              ? subscription.billingCycleAnchor
              : params.billingCycleAnchor,
          remainingCycles:
            params.remainingCycles === undefined
              ? subscription.remainingCycles
              : params.remainingCycles,
          requestedByUserId: actorUserId ?? null,
          reason: params.reason ?? null,
          appliedAt: effectiveAt <= now ? now : null,
          createdAt: now,
          updatedAt: now,
          items: {
            create: params.items.map((item, position) => {
              const price = priceById.get(item.priceId)!
              return {
                id: generateId('SubscriptionAmendmentItem'),
                priceId: item.priceId,
                position,
                quantity: item.quantity,
                unitAmount: price.unitAmount,
                currency: price.currency,
                description:
                  price.plan?.name ??
                  price.addon?.name ??
                  price.item?.name ??
                  price.nickname,
                createdAt: now,
              }
            }),
          },
        },
      })
      if (effectiveAt <= now)
        await applyAmendment(tx, amendmentId, now, actorUserId, now)
      else
        await tx.subscriptionEvent.create({
          data: {
            id: generateId('SubscriptionEvent'),
            subscriptionId,
            type: 'UPDATE_SCHEDULED',
            actorUserId: actorUserId ?? null,
            details: { amendmentId, effectiveAt, timing: params.timing },
            occurredAt: now,
          },
        })
    })

    return ok({ id: amendmentId, applied: effectiveAt <= now })
  } catch (error) {
    if (error instanceof AdvanceInvoiceConflict) return err(error.message, 409)
    console.error('[billing.service.subscriptions.amendments.create]', error)
    return err('Failed to change the subscription.', 500)
  }
}

async function applyAmendment(
  tx: PrismaTransaction,
  amendmentId: string,
  effectiveAt: number,
  actorUserId?: string,
  processedAt = effectiveAt
) {
  const amendment = await tx.subscriptionAmendment.findUniqueOrThrow({
    where: { id: amendmentId },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: { price: true },
      },
      subscription: {
        include: { items: { where: { isActive: true } } },
      },
    },
  })
  const subscription = amendment.subscription
  if (
    subscription.deletedAt !== null ||
    ['PAUSED', 'CANCELED', 'ENDED'].includes(subscription.status)
  )
    throw new Error('The subscription state no longer allows this change.')
  const servicePeriodStart =
    subscription.servicePeriodStart ?? subscription.currentPeriodStart
  const servicePeriodEnd =
    subscription.servicePeriodEnd ?? subscription.currentPeriodEnd
  let adjustmentId: string | null = null
  if (
    amendment.prorationBehavior !== 'NONE' &&
    servicePeriodStart !== null &&
    servicePeriodEnd !== null &&
    effectiveAt < servicePeriodEnd
  ) {
    const oldAmount = subscription.items.reduce(
      (sum, item) => sum + (item.unitAmount ?? 0n) * BigInt(item.quantity),
      0n
    )
    const newAmount = amendment.items.reduce(
      (sum, item) => sum + (item.unitAmount ?? 0n) * BigInt(item.quantity),
      0n
    )
    const oldCredit = calculateProration(
      oldAmount,
      servicePeriodStart,
      servicePeriodEnd,
      effectiveAt
    )
    const newCharge = calculateProration(
      newAmount,
      servicePeriodStart,
      servicePeriodEnd,
      effectiveAt
    )
    const remainingDelta = newCharge - oldCredit
    // Advance billing adjusts the unused, already-invoiced portion. Arrears
    // billing will invoice the new full-period amount, so its adjustment is
    // the old-minus-new amount for the elapsed portion.
    const netAmount =
      subscription.billingTiming === 'IN_ADVANCE'
        ? remainingDelta
        : oldAmount - newAmount + remainingDelta
    const currency =
      amendment.items.find((item) => item.currency)?.currency ??
      subscription.items.find((item) => item.currency)?.currency
    if (!currency) throw new Error('Subscription currency is unavailable.')

    if (netAmount > 0n) {
      adjustmentId = generateId('SubscriptionCharge')
      await tx.subscriptionCharge.create({
        data: {
          id: adjustmentId,
          tenantId: amendment.tenantId,
          subscriptionId: amendment.subscriptionId,
          customerId: subscription.customerId,
          status: 'UNBILLED',
          invoiceBehavior:
            amendment.prorationBehavior === 'ALWAYS_INVOICE'
              ? 'INVOICE_IMMEDIATELY'
              : 'NEXT_INVOICE',
          description: 'Prorated subscription change',
          quantity: 1,
          unitAmount: netAmount,
          currency,
          taxBehavior: amendment.taxBehavior ?? subscription.taxBehavior,
          serviceAt: effectiveAt,
          createdByUserId: actorUserId ?? amendment.requestedByUserId ?? null,
          createdAt: processedAt,
          updatedAt: processedAt,
        },
      })
      if (amendment.prorationBehavior === 'ALWAYS_INVOICE')
        await invoiceUnbilledCharges(
          tx,
          amendment.tenantId,
          amendment.subscriptionId,
          processedAt,
          [adjustmentId]
        )
    } else if (netAmount < 0n) {
      adjustmentId = await createSubscriptionCredit(tx, {
        tenantId: amendment.tenantId,
        subscriptionId: amendment.subscriptionId,
        customerId: subscription.customerId,
        currency,
        amount: -netAmount,
        description: 'Unused subscription service after plan change',
        reason: amendment.reason ?? 'Prorated subscription change',
        source: 'PRORATION',
        createdAt: processedAt,
      })
    }
  }
  await tx.subscriptionItem.updateMany({
    where: { subscriptionId: amendment.subscriptionId, isActive: true },
    data: { isActive: false, endsAt: effectiveAt, updatedAt: processedAt },
  })
  await tx.subscriptionItem.createMany({
    data: amendment.items.map((item) => ({
      id: generateId('SubscriptionItem'),
      subscriptionId: amendment.subscriptionId,
      priceId: item.priceId,
      position: item.position,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      currency: item.currency,
      description: item.description,
      isActive: true,
      startsAt: effectiveAt,
      createdAt: processedAt,
      updatedAt: processedAt,
    })),
  })
  const recurring = amendment.items.find(
    (item) => item.price.intervalUnit && item.price.intervalCount
  )
  const cadence = recurring?.price
  const startsNewCycle =
    servicePeriodEnd !== null && effectiveAt >= servicePeriodEnd
  const targetBillingTiming =
    amendment.billingTiming ?? subscription.billingTiming
  let periodUpdate: Prisma.SubscriptionUncheckedUpdateInput = {}
  if (cadence?.intervalUnit && cadence.intervalCount) {
    if (startsNewCycle) {
      const billingCycleAnchor =
        amendment.billingCycleAnchor !== null &&
        amendment.billingCycleAnchor > effectiveAt
          ? amendment.billingCycleAnchor
          : effectiveAt
      const hasInitialStubPeriod = billingCycleAnchor > effectiveAt
      const periodEnd = hasInitialStubPeriod
        ? billingCycleAnchor
        : addInterval(effectiveAt, cadence.intervalUnit, cadence.intervalCount)
      const expirationBase = hasInitialStubPeriod
        ? billingCycleAnchor
        : effectiveAt
      const nextBillingAt =
        targetBillingTiming === 'IN_ADVANCE' ? effectiveAt : periodEnd
      periodUpdate = {
        currentPeriodStart: effectiveAt,
        currentPeriodEnd: periodEnd,
        servicePeriodStart: effectiveAt,
        servicePeriodEnd: periodEnd,
        billingCycleAnchor,
        completedRegularCycles: 0,
        hasInitialStubPeriod,
        nextBillingAt,
        nextAdvanceInvoiceAt: advanceScheduleAt(
          subscription,
          nextBillingAt,
          processedAt
        ),
        expiresAt:
          amendment.remainingCycles === null
            ? null
            : addInterval(
                expirationBase,
                cadence.intervalUnit,
                cadence.intervalCount * amendment.remainingCycles
              ),
      }
    } else if (servicePeriodStart !== null && servicePeriodEnd !== null) {
      const pendingPeriodStart =
        targetBillingTiming === 'IN_ADVANCE'
          ? servicePeriodEnd
          : servicePeriodStart
      const pendingPeriodEnd =
        targetBillingTiming === 'IN_ADVANCE'
          ? addInterval(
              servicePeriodEnd,
              cadence.intervalUnit,
              cadence.intervalCount
            )
          : servicePeriodEnd
      const expirationBase =
        targetBillingTiming === 'IN_ADVANCE'
          ? servicePeriodEnd
          : servicePeriodStart
      const nextBillingAt =
        targetBillingTiming === 'IN_ADVANCE'
          ? pendingPeriodStart
          : pendingPeriodEnd
      periodUpdate = {
        currentPeriodStart: pendingPeriodStart,
        currentPeriodEnd: pendingPeriodEnd,
        nextBillingAt,
        nextAdvanceInvoiceAt: advanceScheduleAt(
          subscription,
          nextBillingAt,
          processedAt
        ),
        expiresAt:
          amendment.remainingCycles === null
            ? null
            : addInterval(
                expirationBase,
                cadence.intervalUnit,
                cadence.intervalCount * amendment.remainingCycles
              ),
      }
    }
  }
  await tx.subscription.update({
    where: { id: amendment.subscriptionId },
    data: {
      collectionMethod: amendment.collectionMethod ?? undefined,
      billingTiming: amendment.billingTiming ?? undefined,
      paymentTermId: amendment.paymentTermId,
      taxBehavior: amendment.taxBehavior ?? undefined,
      invoiceModeOverride: amendment.invoiceModeOverride,
      renewalPricingPolicy: amendment.renewalPricingPolicy ?? undefined,
      renewalAdjustmentPercent: amendment.renewalAdjustmentPercent,
      billingCycleAnchor: amendment.billingCycleAnchor,
      remainingCycles: amendment.remainingCycles,
      ...periodUpdate,
      updatedAt: processedAt,
    },
  })
  await tx.subscriptionAmendment.update({
    where: { id: amendmentId },
    data: { status: 'APPLIED', appliedAt: processedAt, updatedAt: processedAt },
  })
  await tx.subscriptionEvent.create({
    data: {
      id: generateId('SubscriptionEvent'),
      subscriptionId: amendment.subscriptionId,
      type: 'UPDATED',
      actorUserId: actorUserId ?? amendment.requestedByUserId,
      details: {
        amendmentId,
        prorationBehavior: amendment.prorationBehavior,
        paymentFailureBehavior: amendment.paymentFailureBehavior,
        adjustmentId,
        effectiveAt,
      },
      occurredAt: processedAt,
    },
  })
}

function advanceScheduleAt(
  subscription: {
    advanceBillingEnabled: boolean | null
    advanceBillingDays: number | null
  },
  nextBillingAt: number,
  asOf: number
) {
  return subscription.advanceBillingEnabled && subscription.advanceBillingDays
    ? Math.max(asOf, nextBillingAt - subscription.advanceBillingDays * 86_400)
    : null
}

export async function processDueAmendments(
  tenantId: string,
  asOf = nowUnixSeconds()
) {
  const amendments = await prisma.subscriptionAmendment.findMany({
    where: { tenantId, status: 'PENDING', effectiveAt: { lte: asOf } },
    select: { id: true, effectiveAt: true },
    orderBy: [{ effectiveAt: 'asc' }, { id: 'asc' }],
    take: 100,
  })
  let applied = 0
  for (const amendment of amendments) {
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.subscriptionAmendment.updateMany({
          where: { id: amendment.id, status: 'PENDING' },
          data: { status: 'APPLIED', appliedAt: asOf, updatedAt: asOf },
        })
        if (claimed.count === 0) return
        await applyAmendment(
          tx,
          amendment.id,
          amendment.effectiveAt,
          undefined,
          asOf
        )
        applied += 1
      })
    } catch (error) {
      await prisma.subscriptionAmendment.updateMany({
        where: { id: amendment.id, status: 'PENDING' },
        data: {
          status: 'FAILED',
          failureMessage:
            error instanceof Error ? error.message.slice(0, 1000) : 'Failed',
          updatedAt: asOf,
        },
      })
    }
  }
  return { object: 'subscription_amendment_run' as const, applied }
}
