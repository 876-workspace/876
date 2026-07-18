import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { SubscriptionCreateServiceParams } from '@/types/subscription'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

import {
  resolveSubscriptionComposition,
  validateSubscriptionCatalogComposition,
} from './composition'
import { addInterval, resolveCalendarBillingAnchor } from './period'
import {
  isPromotionCodeEligible,
  lockPromotionRedemption,
  PromotionRedemptionConflict,
  resolveCouponAmount,
} from './promotion-eligibility'

/** Creates a manual subscription from recurring, tenant-owned prices. */
export async function create(
  tenantId: string,
  params: SubscriptionCreateServiceParams,
  options: { replacesSubscriptionId?: string } = {}
): ServiceResult<{ id: string }> {
  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, tenantId, status: 'ACTIVE' },
    select: { id: true, paymentTermId: true },
  })
  if (!customer) return err('The selected customer was not found.', 404)

  const priceIds = params.items.map((item) => item.priceId)
  if (new Set(priceIds).size !== priceIds.length)
    return err(
      'A subscription cannot include the same price more than once.',
      422
    )

  const prices = await prisma.price.findMany({
    where: { id: { in: priceIds }, tenantId, isActive: true },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          trialDays: true,
          billingCycleCount: true,
          productId: true,
          addonAssociations: {
            where: {
              isActive: true,
              associationType: 'MANDATORY',
            },
            include: { addon: true },
          },
        },
      },
      addon: { include: { planAssociations: true } },
      item: { select: { name: true } },
    },
  })
  if (prices.length !== priceIds.length)
    return err('One or more selected prices were not found.', 404)

  const composition = resolveSubscriptionComposition(prices)
  if (composition.error !== null) return err(composition.error, 422)

  const catalogError = validateSubscriptionCatalogComposition(
    prices,
    'SUBSCRIPTION_ACTIVATION'
  )
  if (catalogError) return err(catalogError, 422)
  const plan = prices.find((price) => price.planId !== null)?.plan
  if (!plan) return err('A subscription requires a plan price.', 422)
  const addonPrices = prices.filter((price) => price.addon !== null)

  const { intervalUnit, intervalCount } = composition.data

  const paymentTermId = params.paymentTermId ?? customer.paymentTermId
  const [paymentTerm, promotionCode, preference] = await Promise.all([
    paymentTermId
      ? prisma.paymentTerm.findFirst({
          where: { id: paymentTermId, tenantId, isActive: true },
        })
      : prisma.paymentTerm.findFirst({
          where: { tenantId, isDefault: true, isActive: true },
        }),
    params.promotionCode
      ? prisma.promotionCode.findFirst({
          where: {
            tenantId,
            code: params.promotionCode.toUpperCase(),
            isActive: true,
          },
          include: {
            coupon: {
              include: {
                currencyAmounts: true,
                planApplicabilities: true,
                addonApplicabilities: true,
                customerEligibilities: true,
              },
            },
          },
        })
      : null,
    prisma.subscriptionPreference.findUnique({
      where: { tenantId },
      include: { advanceRules: true, calendarDays: true, calendarMonths: true },
    }),
  ])
  if (paymentTermId && !paymentTerm)
    return err('The selected payment term was not found.', 404)
  if (params.promotionCode && !promotionCode)
    return err('The promotion code is invalid or inactive.', 422)

  const now = nowUnixSeconds()
  if (
    promotionCode &&
    !(await isPromotionCodeEligible({
      tenantId,
      promotionCode,
      customerId: customer.id,
      productId: plan.productId,
      planId: plan.id,
      addonIds: addonPrices.flatMap((price) =>
        price.addonId ? [price.addonId] : []
      ),
      currency: prices[0]?.currency,
      now,
    }))
  )
    return err('The promotion code is not eligible for this subscription.', 422)
  const startAt = params.startAt ?? now
  const collectionMethod =
    params.collectionMethod ??
    preference?.defaultCollectionMethod ??
    'SEND_INVOICE'
  const billingTiming =
    params.billingTiming ?? preference?.defaultBillingTiming ?? 'IN_ADVANCE'
  const prorationBehavior =
    params.prorationBehavior ??
    preference?.defaultProrationBehavior ??
    'CREATE_PRORATIONS'
  const autoApplyCredits =
    params.autoApplyCredits ?? preference?.autoApplyCredits ?? true
  const taxBehavior =
    params.taxBehavior ?? preference?.defaultTaxBehavior ?? 'EXCLUSIVE'
  const renewalPricingPolicy =
    params.renewalPricingPolicy ??
    preference?.defaultRenewalPricingPolicy ??
    'RETAIN_EXISTING'
  const lockActivationPrices =
    params.lockActivationPrices ??
    preference?.lockTrialAndFutureActivationPrice ??
    true
  const advanceBillingEnabled =
    params.advanceBillingEnabled ?? preference?.advanceBillingEnabled ?? false
  const advanceBillingDays =
    params.advanceBillingDays ??
    preference?.advanceRules.find((rule) => rule.intervalUnit === intervalUnit)
      ?.daysBefore ??
    null
  const maximumAdvanceDays =
    intervalUnit === 'WEEK'
      ? 5
      : intervalUnit === 'MONTH'
        ? 25
        : intervalUnit === 'YEAR'
          ? 363
          : 3650
  if (
    advanceBillingEnabled &&
    advanceBillingDays !== null &&
    advanceBillingDays > maximumAdvanceDays
  )
    return err(
      `Advance billing for ${intervalUnit.toLowerCase()} plans cannot exceed ${maximumAdvanceDays} days.`,
      422
    )
  const trialDays = Math.max(
    ...prices.map((price) => price.plan?.trialDays ?? 0)
  )
  const isTrialing = params.status === 'TRIALING'
  const trialEndsAt =
    isTrialing && trialDays > 0 ? startAt + trialDays * 86_400 : null
  const naturalBillingAnchor = isTrialing ? (trialEndsAt ?? startAt) : startAt
  const billingCycleAnchor =
    params.billingCycleAnchor ??
    (preference?.calendarMode === 'FIXED_DATES' &&
    (intervalUnit === 'MONTH' || intervalUnit === 'YEAR')
      ? resolveCalendarBillingAnchor(
          naturalBillingAnchor,
          preference.calendarDays.map((entry) => entry.dayOfMonth),
          preference.calendarMonths.map((entry) => entry.month)
        )
      : naturalBillingAnchor)
  if (billingCycleAnchor < naturalBillingAnchor)
    return err('The billing-cycle anchor cannot be before the start date.', 422)
  const hasInitialStubPeriod = billingCycleAnchor > naturalBillingAnchor
  const currentPeriodStart = naturalBillingAnchor
  const currentPeriodEnd = hasInitialStubPeriod
    ? billingCycleAnchor
    : addInterval(currentPeriodStart, intervalUnit, intervalCount)
  const nextBillingAt =
    params.status === 'DRAFT' || params.status === 'PAUSED'
      ? null
      : billingTiming === 'IN_ARREARS'
        ? currentPeriodEnd
        : currentPeriodStart
  const remainingCycles =
    params.remainingCycles ?? plan.billingCycleCount ?? null
  const expiresAt =
    remainingCycles === null
      ? null
      : addInterval(
          billingCycleAnchor,
          intervalUnit,
          intervalCount * remainingCycles
        )
  const priceById = new Map(prices.map((price) => [price.id, price]))
  const selectedCouponAmount = resolveCouponAmount(
    promotionCode,
    prices[0]?.currency
  )

  try {
    const subscription = await prisma.$transaction(async (tx) => {
      if (promotionCode) {
        await lockPromotionRedemption(
          tx,
          tenantId,
          promotionCode,
          customer.id,
          now
        )
      }

      const created = await tx.subscription.create({
        data: {
          id: generateId('Subscription'),
          tenantId,
          customerId: customer.id,
          sourceAppId: params.sourceAppId ?? null,
          externalReference: params.externalReference ?? null,
          replacesSubscriptionId: options.replacesSubscriptionId ?? null,
          status: params.status,
          startAt,
          currentPeriodStart,
          currentPeriodEnd,
          servicePeriodStart:
            params.status === 'DRAFT'
              ? null
              : params.status === 'TRIALING'
                ? startAt
                : currentPeriodStart,
          servicePeriodEnd:
            params.status === 'DRAFT'
              ? null
              : params.status === 'TRIALING'
                ? (trialEndsAt ?? currentPeriodEnd)
                : currentPeriodEnd,
          billingCycleAnchor,
          completedRegularCycles: 0,
          hasInitialStubPeriod,
          nextBillingAt,
          collectionMethod,
          billingTiming,
          prorationBehavior,
          paymentTermId: paymentTerm?.id ?? null,
          autoApplyCredits,
          taxBehavior,
          invoiceModeOverride: params.invoiceModeOverride ?? null,
          renewalPricingPolicy: renewalPricingPolicy,
          renewalAdjustmentPercent: params.renewalAdjustmentPercent ?? null,
          lockActivationPrices,
          remainingCycles,
          expiresAt,
          priceListId: params.priceListId ?? null,
          priceListName: null,
          advanceBillingEnabled,
          advanceBillingDays,
          nextAdvanceInvoiceAt:
            advanceBillingEnabled && advanceBillingDays
              ? Math.max(
                  startAt,
                  (nextBillingAt ?? currentPeriodEnd) -
                    advanceBillingDays * 86_400
                )
              : null,
          trialEndsAt,
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
          items: {
            create: params.items.map((item, position) => {
              const price = priceById.get(item.priceId)
              if (!price)
                throw new Error('Subscription price unexpectedly unavailable.')

              return {
                id: generateId('SubscriptionItem'),
                priceId: price.id,
                quantity: item.quantity,
                position,
                isActive: true,
                startsAt: startAt,
                unitAmount: price.unitAmount,
                currency: price.currency,
                description:
                  price.plan?.name ??
                  price.addon?.name ??
                  price.item?.name ??
                  price.nickname ??
                  null,
                createdAt: now,
                updatedAt: now,
              }
            }),
          },
          discounts: promotionCode
            ? {
                create: {
                  id: generateId('SubscriptionDiscount'),
                  tenantId,
                  couponId: promotionCode.coupon.id,
                  promotionCodeId: promotionCode.id,
                  status: 'ACTIVE',
                  discountType: promotionCode.coupon.discountType,
                  percentOff: promotionCode.coupon.percentOff,
                  amountOff: selectedCouponAmount,
                  currency: promotionCode.coupon.currency,
                  duration: promotionCode.coupon.duration,
                  remainingCycles:
                    promotionCode.coupon.duration === 'ONCE'
                      ? 1
                      : promotionCode.coupon.durationInCycles,
                  startsAt: currentPeriodStart,
                  createdAt: now,
                  updatedAt: now,
                },
              }
            : undefined,
          events: {
            create: [
              {
                id: generateId('SubscriptionEvent'),
                type: 'CREATED',
                occurredAt: now,
              },
              ...(params.status === 'ACTIVE'
                ? [
                    {
                      id: generateId('SubscriptionEvent'),
                      type: 'ACTIVATED' as const,
                      occurredAt: now,
                    },
                  ]
                : []),
              ...(isTrialing
                ? [
                    {
                      id: generateId('SubscriptionEvent'),
                      type: 'TRIAL_STARTED' as const,
                      occurredAt: now,
                    },
                  ]
                : []),
            ],
          },
        },
      })

      if (promotionCode)
        await tx.couponRedemption.create({
          data: {
            id: generateId('CouponRedemption'),
            tenantId,
            couponId: promotionCode.coupon.id,
            promotionCodeId: promotionCode.id,
            customerId: customer.id,
            subscriptionId: created.id,
            currency: prices[0]?.currency ?? null,
            redeemedAt: now,
          },
        })

      return created
    })

    return ok({ id: subscription.id })
  } catch (error) {
    if (error instanceof PromotionRedemptionConflict)
      return err(
        'The promotion code reached a redemption limit or is no longer active.',
        422
      )
    if (isUniqueConstraintError(error))
      return err(
        'A subscription with this external reference already exists.',
        409
      )
    console.error('[billing.service.subscriptions.create]', error)
    return err('Failed to create the subscription.', 500)
  }
}
