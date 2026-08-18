import type { AdminOrganization } from '@876/admin'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876, billingAdmin } from '@/lib/876'
import { resolveApp } from '../../../_data'
import { SubscribersTable } from './_components/subscribers-table'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

async function retrieveBillingStats(sourceAppId: string) {
  try {
    const result = await billingAdmin.stats.apps.retrieve(sourceAppId)
    if (result.error) {
      console.error(
        '[console.billing.stats] app stats retrieve failed:',
        sourceAppId,
        result.error.message
      )
      return null
    }

    return result.data
  } catch (error) {
    console.error(
      '[console.billing.stats] app stats retrieve failed:',
      sourceAppId,
      error
    )
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan Subscribers not found' }

  const { data } = await $876.entitlementPlans.admin.list({ appId: app.id })
  const products = data?.data ?? []
  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Subscribers • ${app.name}` }
}

export default async function PlanSubscribersPage({ params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await $876.entitlementPlans.admin.list({ appId: app.id })
  const products = data?.data ?? []

  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)
  if (!product) notFound()

  const [coreSubscriptionsResult, billingStats] = await Promise.all([
    $876.appSubscriptions.list(app.id),
    retrieveBillingStats(app.id),
  ])

  const planStats = billingStats?.plans.find(
    (plan) => plan.entitlementReferenceId === product.id
  )

  // Core owns the org -> app entitlement and selected plan. Billing is a
  // commercial projection used for financial enrichment only. A lagging or
  // missing Billing mirror must not make an active Core subscriber disappear
  // from Console.
  if (!coreSubscriptionsResult.error) {
    const coreSubscriptions = (coreSubscriptionsResult.data ?? []).filter(
      (subscription) =>
        subscription.items.some((item) => item.product_id === product.id)
    )

    const orgIds = [
      ...new Set(coreSubscriptions.map((subscription) => subscription.organization_id)),
    ]
    const orgMap = new Map<string, AdminOrganization>()
    await Promise.all(
      orgIds.map(async (organizationId) => {
        const result = await $876.organizations.admin.retrieve({
          id: organizationId,
        })
        if (result.data) orgMap.set(organizationId, result.data)
      })
    )

    const financialByCoreSubscriptionId = new Map(
      (planStats?.subscribers ?? []).flatMap((subscriber) =>
        subscriber.externalReference
          ? [[subscriber.externalReference, subscriber] as const]
          : []
      )
    )

    const subscribers = coreSubscriptions.map((subscription) => {
      const organization = orgMap.get(subscription.organization_id)
      const financial = financialByCoreSubscriptionId.get(subscription.id)

      return {
        id: subscription.id,
        name:
          organization?.doing_business_as ??
          organization?.name ??
          financial?.customerName ??
          subscription.organization_id,
        email:
          organization?.primary_email ??
          financial?.customerId ??
          subscription.organization_id,
        status: subscription.status,
        startedAt: subscription.start_date,
        mrr: Number(financial?.monthlyRecurringRevenue ?? '0'),
      }
    })

    return (
      <div className="space-y-5">
        <div className="mb-2">
          <h2 className="text-lg font-medium tracking-tight">Subscribers</h2>
        </div>
        <SubscribersTable subscribers={subscribers} />
      </div>
    )
  }

  // Degrade to the Billing projection only when Core itself is unavailable.
  // `externalReference` is a Core subscription id, not an email address, so do
  // not display it as contact information.
  const subscribers =
    planStats?.subscribers.map((subscriber) => ({
      id: subscriber.subscriptionId,
      name: subscriber.customerName,
      email: subscriber.customerId,
      status: subscriber.status,
      startedAt: subscriber.startAt,
      mrr: Number(subscriber.monthlyRecurringRevenue),
    })) ?? []

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Subscribers</h2>
      </div>
      <SubscribersTable subscribers={subscribers} />
    </div>
  )
}
