import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type {
  SubscriptionBulkInvoiceModeParams,
  SubscriptionPreferenceUpdateParams,
} from '@/types/subscription'

import { err, ok } from '../result'

const include = {
  advanceRules: { orderBy: { intervalUnit: 'asc' as const } },
  calendarDays: { orderBy: { dayOfMonth: 'asc' as const } },
  calendarMonths: { orderBy: { month: 'asc' as const } },
}

/** Resolves tenant defaults, lazily provisioning an additive default row. */
export async function retrievePreferences(tenantId: string) {
  const existing = await prisma.subscriptionPreference.findUnique({
    where: { tenantId },
    include,
  })
  if (existing) return existing

  const now = nowUnixSeconds()
  await prisma.subscriptionPreference.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId, createdAt: now, updatedAt: now },
  })

  return prisma.subscriptionPreference.findUniqueOrThrow({
    where: { tenantId },
    include,
  })
}

/** Replaces normalized preference children atomically. */
export async function updatePreferences(
  tenantId: string,
  params: SubscriptionPreferenceUpdateParams
): ServiceResult<{ tenantId: string }> {
  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(async (tx) => {
      const preferenceData = {
        defaultTaxBehavior: params.defaultTaxBehavior,
        defaultCollectionMethod: params.defaultCollectionMethod,
        defaultBillingTiming: params.defaultBillingTiming,
        defaultProrationBehavior: params.defaultProrationBehavior,
        defaultInvoiceMode: params.defaultInvoiceMode,
        notifyDraftInvoice: params.notifyDraftInvoice,
        consolidatedBillingEnabled: params.consolidatedBillingEnabled,
        calendarMode: params.calendarMode,
        pauseResumeEnabled: params.pauseResumeEnabled,
        pauseUnbilledChargeBehavior: params.pauseUnbilledChargeBehavior,
        pauseCreditBehavior: params.pauseCreditBehavior,
        defaultResumeBillingBehavior: params.defaultResumeBillingBehavior,
        defaultRenewalPricingPolicy: params.defaultRenewalPricingPolicy,
        lockTrialAndFutureActivationPrice:
          params.lockTrialAndFutureActivationPrice,
        autoApplyCredits: params.autoApplyCredits,
        autoApplyExcessPayments: params.autoApplyExcessPayments,
        advanceBillingEnabled: params.advanceBillingEnabled,
        advanceBillingMethod: params.advanceBillingMethod,
        automateAdvanceBilling: params.automateAdvanceBilling,
        advanceTermsFromPeriodStart: params.advanceTermsFromPeriodStart,
        notifyAdvanceBillingFailure: params.notifyAdvanceBillingFailure,
        updatedAt: now,
      }
      await tx.subscriptionPreference.upsert({
        where: { tenantId },
        create: {
          tenantId,
          ...preferenceData,
          createdAt: now,
        },
        update: preferenceData,
      })

      await tx.subscriptionCalendarDay.deleteMany({ where: { tenantId } })
      await tx.subscriptionCalendarMonth.deleteMany({ where: { tenantId } })
      await tx.subscriptionAdvanceBillingRule.deleteMany({
        where: { tenantId },
      })
      if (params.calendarDays.length)
        await tx.subscriptionCalendarDay.createMany({
          data: params.calendarDays.map((dayOfMonth) => ({
            tenantId,
            dayOfMonth,
          })),
        })
      if (params.calendarMonths.length)
        await tx.subscriptionCalendarMonth.createMany({
          data: params.calendarMonths.map((month) => ({ tenantId, month })),
        })
      if (params.advanceRules.length)
        await tx.subscriptionAdvanceBillingRule.createMany({
          data: params.advanceRules.map((rule) => ({
            tenantId,
            intervalUnit: rule.intervalUnit,
            daysBefore: rule.daysBefore,
            createdAt: now,
            updatedAt: now,
          })),
        })
    })

    return ok({ tenantId })
  } catch (error) {
    console.error('[billing.service.subscriptions.preferences.update]', error)
    return err('Failed to update subscription preferences.', 500)
  }
}

export async function updateInvoiceModes(
  tenantId: string,
  params: SubscriptionBulkInvoiceModeParams,
  actorUserId?: string
): ServiceResult<{ updated: number }> {
  const ids = [...new Set(params.subscriptionIds)]
  const now = nowUnixSeconds()
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.subscription.updateMany({
        where: { tenantId, id: { in: ids }, deletedAt: null },
        data: {
          invoiceModeOverride: params.invoiceModeOverride,
          updatedAt: now,
        },
      })
      if (result.count !== ids.length)
        throw new Error('One or more subscriptions were not found.')
      await tx.subscriptionEvent.createMany({
        data: ids.map((subscriptionId) => ({
          id: generateId('SubscriptionEvent'),
          subscriptionId,
          type: 'UPDATED' as const,
          actorUserId: actorUserId ?? null,
          details: {
            invoiceModeOverride: params.invoiceModeOverride,
            bulkUpdate: true,
          },
          occurredAt: now,
        })),
      })

      return result.count
    })

    return ok({ updated })
  } catch (error) {
    console.error('[billing.service.subscriptions.invoice-modes.update]', error)
    return err('Failed to update subscription invoice preferences.', 500)
  }
}
