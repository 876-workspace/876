import { createHash } from 'node:crypto'

import { getSettings } from '@/config'
import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  applyFinanceProvisioningEvent,
  FinanceConnectionLifecycleConflict,
  findActiveConnectionAuthorization,
  findStatsProduct,
  findStatsSubscriptions,
  findStatsTenant,
  findStatsTenantBySlug,
} from './finance-connections.repository'
import type { FinanceProvisioningEvent } from './finance-connections.schemas'

export async function activeConnectionAuthorization(
  tenantId: string,
  appId: string
) {
  const connection = await findActiveConnectionAuthorization(tenantId, appId)
  return connection?.status === 'ACTIVE'
    ? { scopes: new Set(connection.scopes) }
    : null
}

export async function ensureFinanceConnection(event: FinanceProvisioningEvent) {
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex')
  let result: Awaited<ReturnType<typeof applyFinanceProvisioningEvent>>
  try {
    result = await applyFinanceProvisioningEvent(
      event,
      payloadHash,
      nowUnixSeconds()
    )
  } catch (error) {
    if (error instanceof FinanceConnectionLifecycleConflict)
      throw new AppHttpError({
        code: 'app_finance_connection/lifecycle-conflict',
        message:
          'This lifecycle version conflicts with the current finance connection.',
        httpStatus: 409,
      })
    throw error
  }
  const { receipt, connection, duplicate } = result
  if (receipt.payloadHash !== payloadHash)
    throw new AppHttpError({
      code: 'app_finance_connection/idempotency-conflict',
      message: 'This event ID was already used with a different payload.',
      httpStatus: 409,
    })
  if (!connection)
    throw new Error(
      `Finance receipt ${event.eventId} references a missing connection.`
    )
  if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(connection.status))
    throw new Error(
      `Unexpected persisted finance connection status: ${connection.status}`
    )
  return {
    id: connection.id,
    tenantId: connection.tenantId,
    status: connection.status as 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
    lifecycleVersion: connection.lifecycleVersion,
    applied: receipt.applied,
    duplicate,
  }
}

type StatsSubscription = Awaited<
  ReturnType<typeof findStatsSubscriptions>
>[number]

export async function appStats(tenantId: string, sourceAppId?: string) {
  const [tenant, subscriptions, product] = await Promise.all([
    findStatsTenant(tenantId),
    findStatsSubscriptions(tenantId, sourceAppId),
    sourceAppId ? findStatsProduct(tenantId, sourceAppId) : null,
  ])

  if (sourceAppId) {
    if (subscriptions.length === 0 && !product)
      throw new AppHttpError({
        code: 'billing/app-not-found',
        message: 'Billing statistics for this app were not found.',
        httpStatus: 404,
      })

    return {
      ...buildAppStats(sourceAppId, tenant.defaultCurrency, subscriptions),
      plans: buildPlanStats(subscriptions),
    }
  }

  const byApp = new Map<string, StatsSubscription[]>()
  for (const subscription of subscriptions) {
    if (!subscription.sourceAppId) continue

    const appSubscriptions = byApp.get(subscription.sourceAppId) ?? []
    appSubscriptions.push(subscription)
    byApp.set(subscription.sourceAppId, appSubscriptions)
  }

  return [...byApp.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([appId, appSubscriptions]) =>
      buildAppStats(appId, tenant.defaultCurrency, appSubscriptions)
    )
}

/** Statistics in Console are always scoped to the configured 876 operator tenant. */
export async function platformAppStats(sourceAppId?: string) {
  const tenant = await findStatsTenantBySlug(
    getSettings().platformTenantSlug
  )
  if (!tenant)
    throw new AppHttpError({
      code: 'billing/platform-tenant-not-found',
      message: 'The configured platform Billing workspace was not found.',
      httpStatus: 503,
    })

  return appStats(tenant.id, sourceAppId)
}

function buildAppStats(
  sourceAppId: string,
  currency: string,
  subscriptions: StatsSubscription[]
) {
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
    object: 'app_billing_stats' as const,
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

function buildPlanStats(subscriptions: StatsSubscription[]) {
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

    const planStats = byPlan.get(plan.id) ?? { plan, subscriptions: [] }
    planStats.subscriptions.push(subscription)
    byPlan.set(plan.id, planStats)
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
        object: 'plan_billing_stats' as const,
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
          object: 'plan_subscriber' as const,
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

function calculateMonthlyRecurringRevenue(
  items: StatsSubscription['items']
): bigint {
  let annualRevenue = 0n

  for (const item of items) {
    const plan = item.price.plan
    if (item.price.priceType !== 'RECURRING' || !plan) continue

    const unitAmount = item.unitAmount ?? item.price.unitAmount
    if (unitAmount === null) continue

    const amount = unitAmount * BigInt(item.quantity)
    const intervalCount = BigInt(plan.intervalCount)
    if (intervalCount < 1n) continue

    if (plan.intervalUnit === 'DAY')
      annualRevenue += (amount * 365n) / intervalCount
    else if (plan.intervalUnit === 'WEEK')
      annualRevenue += (amount * 52n) / intervalCount
    else if (plan.intervalUnit === 'MONTH')
      annualRevenue += (amount * 12n) / intervalCount
    else annualRevenue += amount / intervalCount
  }

  return annualRevenue / 12n
}

function hasStatus(status: StatsSubscription['status']) {
  return (subscription: StatsSubscription) => subscription.status === status
}

function isRecurringSubscription(subscription: StatsSubscription): boolean {
  return subscription.status === 'ACTIVE' || subscription.status === 'TRIALING'
}
