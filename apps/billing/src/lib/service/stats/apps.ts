import { prisma } from '@/lib/db'
import type {
  AppBillingStats,
  AppBillingStatsDetail,
  PlanBillingStats,
} from '@/types/stats'

import { calculateMonthlyRecurringRevenue } from './mrr'

const subscriptionInclude = {
  customer: { select: { name: true } },
  items: {
    orderBy: { position: 'asc' as const },
    select: {
      quantity: true,
      unitAmount: true,
      price: {
        select: {
          unitAmount: true,
          priceType: true,
          plan: {
            select: {
              id: true,
              code: true,
              name: true,
              entitlementReferenceId: true,
              intervalUnit: true,
              intervalCount: true,
            },
          },
        },
      },
    },
  },
  invoices: {
    where: { status: { notIn: ['DRAFT' as const, 'VOID' as const] } },
    select: { totalAmount: true, amountDue: true },
  },
}

type StatsSubscription = Awaited<
  ReturnType<typeof findStatsSubscriptions>
>[number]

/** Lists tenant-scoped financial rollups for all attributed core apps. */
export async function listAppStats(
  tenantId: string
): Promise<AppBillingStats[]> {
  const [tenant, subscriptions] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { defaultCurrency: true },
    }),
    findStatsSubscriptions(tenantId),
  ])

  const byApp = new Map<string, StatsSubscription[]>()
  for (const subscription of subscriptions) {
    if (!subscription.sourceAppId) continue

    const rows = byApp.get(subscription.sourceAppId) ?? []
    rows.push(subscription)
    byApp.set(subscription.sourceAppId, rows)
  }

  return [...byApp.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sourceAppId, rows]) =>
      buildAppStats(sourceAppId, tenant.defaultCurrency, rows)
    )
}

/** Retrieves one tenant-scoped app rollup and its per-plan subscribers. */
export async function retrieveAppStats(
  tenantId: string,
  sourceAppId: string
): Promise<AppBillingStatsDetail | null> {
  const [tenant, product, subscriptions] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { defaultCurrency: true },
    }),
    prisma.product.findFirst({
      where: { tenantId, sourceAppId },
      select: { id: true },
    }),
    findStatsSubscriptions(tenantId, sourceAppId),
  ])
  if (subscriptions.length === 0 && !product) return null

  return {
    ...buildAppStats(sourceAppId, tenant.defaultCurrency, subscriptions),
    plans: buildPlanStats(subscriptions),
  }
}

function findStatsSubscriptions(tenantId: string, sourceAppId?: string) {
  return prisma.subscription.findMany({
    where: {
      tenantId,
      sourceAppId: sourceAppId === undefined ? { not: null } : sourceAppId,
    },
    select: {
      id: true,
      sourceAppId: true,
      externalReference: true,
      customerId: true,
      status: true,
      startAt: true,
      currentPeriodEnd: true,
      createdAt: true,
      ...subscriptionInclude,
    },
    orderBy: { createdAt: 'desc' },
  })
}

function buildAppStats(
  sourceAppId: string,
  currency: string,
  subscriptions: StatsSubscription[]
): AppBillingStats {
  let invoicedTotal = 0n
  let outstandingTotal = 0n

  for (const subscription of subscriptions) {
    for (const invoice of subscription.invoices) {
      invoicedTotal += invoice.totalAmount
      outstandingTotal += invoice.amountDue
    }
  }

  const recurringItems = subscriptions
    .filter(isRecurringSubscription)
    .flatMap((subscription) => subscription.items)

  return {
    object: 'app_billing_stats',
    sourceAppId,
    activeSubscriptions: subscriptions.filter(hasStatus('ACTIVE')).length,
    trialingSubscriptions: subscriptions.filter(hasStatus('TRIALING')).length,
    canceledSubscriptions: subscriptions.filter(hasStatus('CANCELED')).length,
    customerCount: new Set(
      subscriptions.map((subscription) => subscription.customerId)
    ).size,
    monthlyRecurringRevenue:
      calculateMonthlyRecurringRevenue(recurringItems).toString(),
    currency,
    invoicedTotal: invoicedTotal.toString(),
    paidTotal: (invoicedTotal - outstandingTotal).toString(),
    outstandingTotal: outstandingTotal.toString(),
  }
}

function buildPlanStats(
  subscriptions: StatsSubscription[]
): PlanBillingStats[] {
  const byPlan = new Map<
    string,
    {
      plan: NonNullable<StatsSubscription['items'][number]['price']['plan']>
      subscriptions: StatsSubscription[]
    }
  >()

  for (const subscription of subscriptions) {
    const plan = subscription.items[0]?.price.plan
    if (!plan) continue

    const group = byPlan.get(plan.id) ?? { plan, subscriptions: [] }
    group.subscriptions.push(subscription)
    byPlan.set(plan.id, group)
  }

  return [...byPlan.values()]
    .sort(
      (left, right) =>
        left.plan.code.localeCompare(right.plan.code) ||
        left.plan.id.localeCompare(right.plan.id)
    )
    .map(({ plan, subscriptions: planSubscriptions }) => {
      const recurringSubscriptions = planSubscriptions.filter(
        isRecurringSubscription
      )

      return {
        object: 'plan_billing_stats',
        planId: plan.id,
        code: plan.code,
        name: plan.name,
        entitlementReferenceId: plan.entitlementReferenceId,
        activeSubscriptions: planSubscriptions.filter(hasStatus('ACTIVE'))
          .length,
        trialingSubscriptions: planSubscriptions.filter(hasStatus('TRIALING'))
          .length,
        monthlyRecurringRevenue: calculateMonthlyRecurringRevenue(
          recurringSubscriptions.flatMap((subscription) => subscription.items)
        ).toString(),
        subscribers: planSubscriptions.slice(0, 50).map((subscription) => ({
          object: 'plan_subscriber',
          subscriptionId: subscription.id,
          externalReference: subscription.externalReference,
          customerId: subscription.customerId,
          customerName: subscription.customer.name,
          status: subscription.status,
          startAt: subscription.startAt,
          currentPeriodEnd: subscription.currentPeriodEnd,
          monthlyRecurringRevenue: (isRecurringSubscription(subscription)
            ? calculateMonthlyRecurringRevenue(subscription.items)
            : 0n
          ).toString(),
        })),
      }
    })
}

function hasStatus(status: string) {
  return (subscription: StatsSubscription) => subscription.status === status
}

function isRecurringSubscription(subscription: StatsSubscription): boolean {
  return subscription.status === 'ACTIVE' || subscription.status === 'TRIALING'
}
