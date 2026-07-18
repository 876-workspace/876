import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type {
  SubscriptionCancelParams,
  SubscriptionExtendParams,
  SubscriptionPauseParams,
  SubscriptionReactivateParams,
  SubscriptionResumeParams,
} from '@/types/subscription'

import { err, ok } from '../result'
import { calculateProration } from '../billing-engine'
import { addInterval } from './period'
import { invoiceUnbilledCharges } from './charges'
import { create } from './create'
import { createSubscriptionCredit } from './credits'
import {
  AdvanceInvoiceConflict,
  invalidateAdvanceInvoices,
} from './advance-invoices'
import { retrievePreferences } from './preferences'

export async function pause(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionPauseParams,
  actorUserId?: string
): ServiceResult<{ id: string; scheduled: boolean }> {
  const [subscription, preference] = await Promise.all([
    prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId, deletedAt: null },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        servicePeriodEnd: true,
      },
    }),
    retrievePreferences(tenantId),
  ])
  if (!subscription) return err('The subscription was not found.', 404)
  if (!preference.pauseResumeEnabled)
    return err('Pause and resume are disabled for this workspace.', 409)
  if (subscription.status !== 'ACTIVE')
    return err('Only an active subscription can be paused.', 409)

  const now = nowUnixSeconds()
  const effectiveAt = resolveEffectiveAt(
    params.timing,
    params.effectiveAt,
    subscription.servicePeriodEnd ?? subscription.currentPeriodEnd,
    now
  )
  if (effectiveAt === null)
    return err('The subscription does not have a current billing period.', 409)
  if (effectiveAt < now)
    return err('The pause date cannot be in the past.', 422)
  if (params.resumeAt != null && params.resumeAt <= effectiveAt)
    return err('The resume date must be after the pause date.', 422)

  const scheduleId = generateId('SubscriptionLifecycleSchedule')
  try {
    await prisma.$transaction(async (tx) => {
      await invalidateAdvanceInvoices(
        tx,
        tenantId,
        subscriptionId,
        now,
        'Subscription pause requested'
      )
      await cancelPendingChanges(tx, subscriptionId, now)
      await tx.subscriptionLifecycleSchedule.create({
        data: {
          id: scheduleId,
          tenantId,
          subscriptionId,
          action: 'PAUSE',
          effectiveAt,
          status: effectiveAt <= now ? 'APPLIED' : 'SCHEDULED',
          resumeAt: params.resumeAt ?? null,
          pauseUnbilledBehavior:
            params.pauseUnbilledBehavior ??
            preference.pauseUnbilledChargeBehavior,
          pauseCreditBehavior:
            params.pauseCreditBehavior ?? preference.pauseCreditBehavior,
          resumeBillingBehavior:
            params.resumeBillingBehavior ??
            preference.defaultResumeBillingBehavior,
          reason: params.reason ?? null,
          requestedByUserId: actorUserId ?? null,
          appliedAt: effectiveAt <= now ? now : null,
          createdAt: now,
          updatedAt: now,
        },
      })
      if (effectiveAt <= now)
        await applyPause(tx, subscriptionId, now, {
          unbilledBehavior:
            params.pauseUnbilledBehavior ??
            preference.pauseUnbilledChargeBehavior,
          creditBehavior:
            params.pauseCreditBehavior ?? preference.pauseCreditBehavior,
          resumeAt: params.resumeAt ?? null,
          resumeBillingBehavior:
            params.resumeBillingBehavior ??
            preference.defaultResumeBillingBehavior,
          reason: params.reason ?? null,
          actorUserId: actorUserId ?? null,
        })
      else
        await tx.subscriptionEvent.create({
          data: {
            id: generateId('SubscriptionEvent'),
            subscriptionId,
            type: 'PAUSE_SCHEDULED',
            actorUserId: actorUserId ?? null,
            details: { scheduleId, effectiveAt, resumeAt: params.resumeAt },
            occurredAt: now,
          },
        })
    })
    return ok({ id: scheduleId, scheduled: effectiveAt > now })
  } catch (error) {
    if (error instanceof AdvanceInvoiceConflict) return err(error.message, 409)
    console.error('[billing.service.subscriptions.pause]', error)
    return err('Failed to pause the subscription.', 500)
  }
}

export async function resume(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionResumeParams,
  actorUserId?: string
): ServiceResult<{ id: string; scheduled: boolean }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  if (subscription.status !== 'PAUSED')
    return err('Only a paused subscription can be resumed.', 409)

  const now = nowUnixSeconds()
  const effectiveAt = params.effectiveAt ?? now
  if (effectiveAt < now)
    return err('The resume date cannot be in the past.', 422)
  const scheduleId = generateId('SubscriptionLifecycleSchedule')
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscriptionLifecycleSchedule.updateMany({
        where: {
          subscriptionId,
          action: 'RESUME',
          status: 'SCHEDULED',
        },
        data: { status: 'CANCELED', canceledAt: now, updatedAt: now },
      })
      await tx.subscriptionLifecycleSchedule.create({
        data: {
          id: scheduleId,
          tenantId,
          subscriptionId,
          action: 'RESUME',
          effectiveAt,
          status: effectiveAt <= now ? 'APPLIED' : 'SCHEDULED',
          resumeBillingBehavior: params.resumeBillingBehavior,
          reason: params.reason ?? null,
          requestedByUserId: actorUserId ?? null,
          appliedAt: effectiveAt <= now ? now : null,
          createdAt: now,
          updatedAt: now,
        },
      })
      if (effectiveAt <= now)
        await applyResume(
          tx,
          subscriptionId,
          now,
          params.resumeBillingBehavior,
          params.reason ?? null,
          actorUserId ?? null
        )
      else
        await tx.subscriptionEvent.create({
          data: {
            id: generateId('SubscriptionEvent'),
            subscriptionId,
            type: 'RESUME_SCHEDULED',
            actorUserId: actorUserId ?? null,
            details: { scheduleId, effectiveAt },
            occurredAt: now,
          },
        })
    })
    return ok({ id: scheduleId, scheduled: effectiveAt > now })
  } catch (error) {
    console.error('[billing.service.subscriptions.resume]', error)
    return err('Failed to resume the subscription.', 500)
  }
}

export async function cancel(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionCancelParams,
  actorUserId?: string
): ServiceResult<{ id: string; scheduled: boolean }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    select: {
      id: true,
      status: true,
      currentPeriodEnd: true,
      servicePeriodEnd: true,
    },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  if (subscription.status === 'CANCELED' || subscription.status === 'ENDED')
    return err('The subscription has already ended.', 409)

  const now = nowUnixSeconds()
  const effectiveAt = resolveEffectiveAt(
    params.timing,
    params.effectiveAt,
    subscription.servicePeriodEnd ?? subscription.currentPeriodEnd,
    now
  )
  if (effectiveAt === null)
    return err('The subscription does not have a current billing period.', 409)
  if (effectiveAt < now)
    return err('The cancellation date cannot be in the past.', 422)
  const scheduleId = generateId('SubscriptionLifecycleSchedule')
  try {
    await prisma.$transaction(async (tx) => {
      await invalidateAdvanceInvoices(
        tx,
        tenantId,
        subscriptionId,
        now,
        'Subscription cancellation requested'
      )
      await cancelPendingChanges(tx, subscriptionId, now)
      await tx.subscriptionLifecycleSchedule.updateMany({
        where: {
          subscriptionId,
          action: 'CANCEL',
          status: 'SCHEDULED',
        },
        data: { status: 'CANCELED', canceledAt: now, updatedAt: now },
      })
      await tx.subscriptionLifecycleSchedule.create({
        data: {
          id: scheduleId,
          tenantId,
          subscriptionId,
          action: 'CANCEL',
          effectiveAt,
          status: effectiveAt <= now ? 'APPLIED' : 'SCHEDULED',
          reasonCode: params.reasonCode ?? null,
          reason: params.reason ?? null,
          feedback: params.feedback ?? null,
          requestedByUserId: actorUserId ?? null,
          appliedAt: effectiveAt <= now ? now : null,
          createdAt: now,
          updatedAt: now,
        },
      })
      if (effectiveAt <= now)
        await applyCancel(
          tx,
          subscriptionId,
          now,
          params.reason ?? null,
          actorUserId ?? null
        )
      else {
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: { cancelAtPeriodEnd: true, updatedAt: now },
        })
        await tx.subscriptionEvent.create({
          data: {
            id: generateId('SubscriptionEvent'),
            subscriptionId,
            type: 'CANCELLATION_SCHEDULED',
            actorUserId: actorUserId ?? null,
            details: { scheduleId, effectiveAt, reasonCode: params.reasonCode },
            occurredAt: now,
          },
        })
      }
    })
    return ok({ id: scheduleId, scheduled: effectiveAt > now })
  } catch (error) {
    if (error instanceof AdvanceInvoiceConflict) return err(error.message, 409)
    console.error('[billing.service.subscriptions.cancel]', error)
    return err('Failed to cancel the subscription.', 500)
  }
}

export async function reactivate(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionReactivateParams,
  actorUserId?: string
): ServiceResult<{ id: string; successor: boolean }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    include: { items: true },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  const now = nowUnixSeconds()

  if (subscription.cancelAtPeriodEnd && subscription.status !== 'CANCELED') {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: { cancelAtPeriodEnd: false, updatedAt: now },
        })
        await tx.subscriptionLifecycleSchedule.updateMany({
          where: {
            subscriptionId,
            action: 'CANCEL',
            status: 'SCHEDULED',
          },
          data: { status: 'CANCELED', canceledAt: now, updatedAt: now },
        })
        await tx.subscriptionEvent.create({
          data: {
            id: generateId('SubscriptionEvent'),
            subscriptionId,
            type: 'REACTIVATED',
            actorUserId: actorUserId ?? null,
            details: { stoppedScheduledCancellation: true },
            occurredAt: now,
          },
        })
      })
      return ok({ id: subscriptionId, successor: false })
    } catch (error) {
      console.error('[billing.service.subscriptions.reactivate]', error)
      return err('Failed to reactivate the subscription.', 500)
    }
  }

  if (subscription.status !== 'CANCELED' && subscription.status !== 'ENDED')
    return err(
      'Only a canceled or expired subscription can be reactivated.',
      409
    )

  const result = await create(
    tenantId,
    {
      customerId: subscription.customerId,
      items: subscription.items.map((item) => ({
        priceId: item.priceId,
        quantity: item.quantity,
      })),
      status: 'ACTIVE',
      startAt: params.startAt ?? now,
      sourceAppId: subscription.sourceAppId,
      collectionMethod: subscription.collectionMethod,
      billingTiming: subscription.billingTiming,
      prorationBehavior: subscription.prorationBehavior,
      paymentTermId: subscription.paymentTermId,
      autoApplyCredits: subscription.autoApplyCredits,
      taxBehavior: subscription.taxBehavior,
      invoiceModeOverride: subscription.invoiceModeOverride,
      renewalPricingPolicy: subscription.renewalPricingPolicy,
      renewalAdjustmentPercent:
        subscription.renewalAdjustmentPercent?.toNumber() ?? null,
      lockActivationPrices: subscription.lockActivationPrices,
      remainingCycles: subscription.remainingCycles,
      priceListId: subscription.priceListId,
      advanceBillingEnabled: subscription.advanceBillingEnabled,
      advanceBillingDays: subscription.advanceBillingDays,
    },
    { replacesSubscriptionId: subscriptionId }
  )
  if (result.error !== null) return result

  await prisma.subscriptionEvent.create({
    data: {
      id: generateId('SubscriptionEvent'),
      subscriptionId,
      type: 'REACTIVATED',
      actorUserId: actorUserId ?? null,
      details: {
        successorSubscriptionId: result.data.id,
        reason: params.reason,
      },
      occurredAt: now,
    },
  })
  return ok({ id: result.data.id, successor: true })
}

export async function extend(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionExtendParams,
  actorUserId?: string
): ServiceResult<{ id: string }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    select: {
      id: true,
      status: true,
      remainingCycles: true,
      currentPeriodStart: true,
      billingCycleAnchor: true,
      hasInitialStubPeriod: true,
      items: {
        where: { isActive: true },
        select: {
          price: { select: { intervalUnit: true, intervalCount: true } },
        },
        take: 1,
      },
    },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  if (['CANCELED', 'ENDED'].includes(subscription.status))
    return err('Canceled or expired subscriptions cannot be extended.', 409)
  if (subscription.remainingCycles === null && !params.neverExpires)
    return err('This subscription already has no fixed expiry.', 409)

  const now = nowUnixSeconds()
  const remainingCycles = params.neverExpires
    ? null
    : (subscription.remainingCycles ?? 0) + params.additionalCycles
  const cadence = subscription.items[0]?.price
  const expiresAt =
    remainingCycles === null
      ? null
      : subscription.currentPeriodStart !== null &&
          cadence?.intervalUnit &&
          cadence.intervalCount
        ? addInterval(
            subscription.hasInitialStubPeriod &&
              subscription.billingCycleAnchor !== null
              ? subscription.billingCycleAnchor
              : subscription.currentPeriodStart,
            cadence.intervalUnit,
            cadence.intervalCount * remainingCycles
          )
        : null
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { remainingCycles, expiresAt, updatedAt: now },
      })
      await tx.subscriptionEvent.create({
        data: {
          id: generateId('SubscriptionEvent'),
          subscriptionId,
          type: 'EXTENDED',
          actorUserId: actorUserId ?? null,
          details: {
            additionalCycles: params.additionalCycles,
            neverExpires: params.neverExpires,
            remainingCycles,
            reason: params.reason,
          },
          occurredAt: now,
        },
      })
    })
    return ok({ id: subscriptionId })
  } catch (error) {
    console.error('[billing.service.subscriptions.extend]', error)
    return err('Failed to extend the subscription.', 500)
  }
}

/** Soft deletion preserves invoices, events, and reporting joins. */
export async function remove(
  tenantId: string,
  subscriptionId: string,
  actorUserId?: string
): ServiceResult<{ id: string }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    select: { id: true, servicePeriodStart: true },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  const now = nowUnixSeconds()
  try {
    await prisma.$transaction(async (tx) => {
      await invalidateAdvanceInvoices(
        tx,
        tenantId,
        subscriptionId,
        now,
        'Subscription deleted from active records'
      )
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELED',
          cancelAtPeriodEnd: false,
          canceledAt: now,
          endedAt: now,
          servicePeriodStart:
            subscription.servicePeriodStart !== null &&
            subscription.servicePeriodStart > now
              ? null
              : undefined,
          servicePeriodEnd:
            subscription.servicePeriodStart !== null &&
            subscription.servicePeriodStart <= now
              ? now
              : null,
          deletedAt: now,
          nextBillingAt: null,
          nextAdvanceInvoiceAt: null,
          updatedAt: now,
        },
      })
      await tx.subscriptionLifecycleSchedule.updateMany({
        where: { subscriptionId, status: 'SCHEDULED' },
        data: { status: 'CANCELED', canceledAt: now, updatedAt: now },
      })
      await tx.subscriptionAmendment.updateMany({
        where: { subscriptionId, status: 'PENDING' },
        data: { status: 'CANCELED', canceledAt: now, updatedAt: now },
      })
      await tx.subscriptionEvent.create({
        data: {
          id: generateId('SubscriptionEvent'),
          subscriptionId,
          type: 'DELETED',
          actorUserId: actorUserId ?? null,
          occurredAt: now,
        },
      })
    })
    return ok({ id: subscriptionId })
  } catch (error) {
    if (error instanceof AdvanceInvoiceConflict) return err(error.message, 409)
    console.error('[billing.service.subscriptions.delete]', error)
    return err('Failed to delete the subscription.', 500)
  }
}

function resolveEffectiveAt(
  timing: 'IMMEDIATE' | 'END_OF_TERM' | 'SCHEDULED',
  requestedAt: number | null | undefined,
  periodEnd: number | null,
  now: number
): number | null {
  if (timing === 'IMMEDIATE') return now
  if (timing === 'END_OF_TERM') return periodEnd
  return requestedAt ?? null
}

async function cancelPendingChanges(
  tx: PrismaTransaction,
  subscriptionId: string,
  now: number
) {
  await tx.subscriptionAmendment.updateMany({
    where: { subscriptionId, status: 'PENDING' },
    data: { status: 'CANCELED', canceledAt: now, updatedAt: now },
  })
}

async function applyPause(
  tx: PrismaTransaction,
  subscriptionId: string,
  effectiveAt: number,
  options: {
    unbilledBehavior: 'RETAIN' | 'INVOICE_IMMEDIATELY'
    creditBehavior: 'NONE' | 'PRORATE_CREDIT'
    resumeAt: number | null
    resumeBillingBehavior: 'CONTINUE_EXISTING_PERIOD' | 'START_NEW_PERIOD'
    reason: string | null
    actorUserId: string | null
  },
  processedAt = effectiveAt
) {
  const subscription = await tx.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { items: { where: { isActive: true } } },
  })
  if (options.unbilledBehavior === 'INVOICE_IMMEDIATELY')
    await invoiceUnbilledCharges(
      tx,
      subscription.tenantId,
      subscriptionId,
      processedAt
    )

  let creditNoteId: string | null = null
  if (
    options.creditBehavior === 'PRORATE_CREDIT' &&
    subscription.billingTiming === 'IN_ADVANCE' &&
    (subscription.servicePeriodStart ?? subscription.currentPeriodStart) !==
      null &&
    (subscription.servicePeriodEnd ?? subscription.currentPeriodEnd) !== null
  ) {
    const amount = subscription.items.reduce(
      (sum, item) => sum + (item.unitAmount ?? 0n) * BigInt(item.quantity),
      0n
    )
    const unusedAmount = calculateProration(
      amount,
      subscription.servicePeriodStart ?? subscription.currentPeriodStart!,
      subscription.servicePeriodEnd ?? subscription.currentPeriodEnd!,
      effectiveAt
    )
    const currency = subscription.items.find((item) => item.currency)?.currency
    if (currency)
      creditNoteId = await createSubscriptionCredit(tx, {
        tenantId: subscription.tenantId,
        subscriptionId,
        customerId: subscription.customerId,
        currency,
        amount: unusedAmount,
        description: 'Unused prepaid subscription service after pause',
        reason: options.reason ?? 'Subscription paused',
        source: 'PAUSE',
        createdAt: processedAt,
      })
  }

  await tx.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'PAUSED',
      pausedAt: effectiveAt,
      nextBillingAt: null,
      nextAdvanceInvoiceAt: null,
      updatedAt: processedAt,
    },
  })
  await tx.subscriptionEvent.create({
    data: {
      id: generateId('SubscriptionEvent'),
      subscriptionId,
      type: 'PAUSED',
      actorUserId: options.actorUserId,
      details: {
        reason: options.reason,
        unbilledBehavior: options.unbilledBehavior,
        creditBehavior: options.creditBehavior,
        creditNoteId,
        resumeAt: options.resumeAt,
        effectiveAt,
      },
      occurredAt: processedAt,
    },
  })
  if (options.resumeAt)
    await tx.subscriptionLifecycleSchedule.create({
      data: {
        id: generateId('SubscriptionLifecycleSchedule'),
        tenantId: subscription.tenantId,
        subscriptionId,
        action: 'RESUME',
        effectiveAt: options.resumeAt,
        status: 'SCHEDULED',
        resumeBillingBehavior: options.resumeBillingBehavior,
        reason: 'Automatic resume after scheduled pause',
        requestedByUserId: options.actorUserId,
        createdAt: processedAt,
        updatedAt: processedAt,
      },
    })
}

async function applyResume(
  tx: PrismaTransaction,
  subscriptionId: string,
  effectiveAt: number,
  behavior: 'CONTINUE_EXISTING_PERIOD' | 'START_NEW_PERIOD',
  reason: string | null,
  actorUserId: string | null,
  processedAt = effectiveAt
) {
  const subscription = await tx.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { items: { include: { price: true } } },
  })
  const recurring = subscription.items.find(
    (item) => item.price.intervalUnit && item.price.intervalCount
  )
  if (!recurring?.price.intervalUnit || !recurring.price.intervalCount)
    throw new Error('Subscription cadence is unavailable.')

  const servicePeriodEnd =
    subscription.servicePeriodEnd ?? subscription.currentPeriodEnd
  const canContinue =
    behavior === 'CONTINUE_EXISTING_PERIOD' &&
    servicePeriodEnd !== null &&
    effectiveAt < servicePeriodEnd
  const periodStart = canContinue
    ? (subscription.servicePeriodStart ??
      subscription.currentPeriodStart ??
      effectiveAt)
    : effectiveAt
  const periodEnd = canContinue
    ? servicePeriodEnd
    : addInterval(
        effectiveAt,
        recurring.price.intervalUnit,
        recurring.price.intervalCount
      )
  const nextBillingAt = canContinue
    ? subscription.billingTiming === 'IN_ADVANCE'
      ? subscription.currentPeriodStart
      : subscription.currentPeriodEnd
    : subscription.billingTiming === 'IN_ADVANCE'
      ? periodStart
      : periodEnd
  const nextAdvanceInvoiceAt =
    subscription.advanceBillingEnabled &&
    subscription.advanceBillingDays &&
    nextBillingAt
      ? Math.max(
          processedAt,
          nextBillingAt - subscription.advanceBillingDays * 86_400
        )
      : null
  await tx.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'ACTIVE',
      pausedAt: null,
      servicePeriodStart: periodStart,
      servicePeriodEnd: periodEnd,
      nextAdvanceInvoiceAt,
      ...(canContinue
        ? {
            nextBillingAt,
          }
        : {
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            billingCycleAnchor: periodStart,
            completedRegularCycles: 0,
            hasInitialStubPeriod: false,
            nextBillingAt,
          }),
      updatedAt: processedAt,
    },
  })
  await tx.subscriptionEvent.create({
    data: {
      id: generateId('SubscriptionEvent'),
      subscriptionId,
      type: 'RESUMED',
      actorUserId,
      details: { behavior, reason, periodStart, periodEnd, effectiveAt },
      occurredAt: processedAt,
    },
  })
}

async function applyCancel(
  tx: PrismaTransaction,
  subscriptionId: string,
  effectiveAt: number,
  reason: string | null,
  actorUserId: string | null,
  processedAt = effectiveAt
) {
  const subscription = await tx.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    select: { servicePeriodStart: true },
  })
  const serviceStarted =
    subscription.servicePeriodStart !== null &&
    subscription.servicePeriodStart <= effectiveAt
  await tx.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'CANCELED',
      cancelAtPeriodEnd: false,
      canceledAt: effectiveAt,
      endedAt: effectiveAt,
      servicePeriodStart: serviceStarted ? undefined : null,
      servicePeriodEnd: serviceStarted ? effectiveAt : null,
      nextBillingAt: null,
      nextAdvanceInvoiceAt: null,
      updatedAt: processedAt,
    },
  })
  await tx.subscriptionEvent.create({
    data: {
      id: generateId('SubscriptionEvent'),
      subscriptionId,
      type: 'CANCELED',
      actorUserId,
      details: { reason, effectiveAt },
      occurredAt: processedAt,
    },
  })
}

export async function processDueLifecycleSchedules(
  tenantId: string,
  asOf = nowUnixSeconds()
) {
  const schedules = await prisma.subscriptionLifecycleSchedule.findMany({
    where: { tenantId, status: 'SCHEDULED', effectiveAt: { lte: asOf } },
    orderBy: [{ effectiveAt: 'asc' }, { id: 'asc' }],
    take: 100,
  })
  let applied = 0
  for (const schedule of schedules) {
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.subscriptionLifecycleSchedule.updateMany({
          where: { id: schedule.id, status: 'SCHEDULED' },
          data: { status: 'APPLIED', appliedAt: asOf, updatedAt: asOf },
        })
        if (claimed.count === 0) return
        const subscription = await tx.subscription.findUnique({
          where: { id: schedule.subscriptionId },
          select: { status: true, deletedAt: true },
        })
        const canApply =
          subscription?.deletedAt === null &&
          ((schedule.action === 'PAUSE' && subscription.status === 'ACTIVE') ||
            (schedule.action === 'RESUME' &&
              subscription.status === 'PAUSED') ||
            (schedule.action === 'CANCEL' &&
              !['CANCELED', 'ENDED'].includes(subscription.status)))
        if (!canApply) {
          await tx.subscriptionLifecycleSchedule.update({
            where: { id: schedule.id },
            data: {
              status: 'SKIPPED',
              appliedAt: null,
              failureMessage:
                'The subscription state no longer allows this action.',
              updatedAt: asOf,
            },
          })
          return
        }
        if (schedule.action === 'PAUSE')
          await applyPause(
            tx,
            schedule.subscriptionId,
            schedule.effectiveAt,
            {
              unbilledBehavior: schedule.pauseUnbilledBehavior ?? 'RETAIN',
              creditBehavior: schedule.pauseCreditBehavior ?? 'NONE',
              resumeAt: schedule.resumeAt,
              resumeBillingBehavior:
                schedule.resumeBillingBehavior ?? 'START_NEW_PERIOD',
              reason: schedule.reason,
              actorUserId: schedule.requestedByUserId,
            },
            asOf
          )
        if (schedule.action === 'RESUME')
          await applyResume(
            tx,
            schedule.subscriptionId,
            schedule.effectiveAt,
            schedule.resumeBillingBehavior ?? 'START_NEW_PERIOD',
            schedule.reason,
            schedule.requestedByUserId,
            asOf
          )
        if (schedule.action === 'CANCEL')
          await applyCancel(
            tx,
            schedule.subscriptionId,
            schedule.effectiveAt,
            schedule.reason,
            schedule.requestedByUserId,
            asOf
          )
        applied += 1
      })
    } catch (error) {
      await prisma.subscriptionLifecycleSchedule.updateMany({
        where: { id: schedule.id, status: 'SCHEDULED' },
        data: {
          status: 'FAILED',
          failureMessage:
            error instanceof Error ? error.message.slice(0, 1000) : 'Failed',
          updatedAt: asOf,
        },
      })
    }
  }
  return { object: 'subscription_schedule_run' as const, applied }
}
