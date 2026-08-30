import { platform } from '@/lib/services/platform'
import { Suspense } from 'react'
import type { AdminOrganization } from '@876/admin'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { billingAdmin } from '@/lib/876'
import {
  listCompleteAppSubscriptions,
  resolveApp,
  resolveProduct,
} from '../../../_data'
import { SubscribersTable } from './_components/subscribers-table'

type Props = {
  params: Promise<{ slug: string; planSlug: string }>
  searchParams: Promise<{ status?: string }>
}

const SUBSCRIBERS_SKELETON_COLUMNS = [
  { label: 'Customer' },
  { label: 'Status' },
  { label: 'Started' },
  { label: 'MRR' },
] satisfies DataTableSkeletonColumn[]

const SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'paused',
  'canceled',
] as const

const SUBSCRIBER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All' },
  ...SUBSCRIPTION_STATUSES.map((status) => ({
    value: status,
    label:
      status === 'past_due'
        ? 'Past due'
        : status.charAt(0).toUpperCase() + status.slice(1),
  })),
]

function isSubscriberStatus(status: string | undefined): boolean {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(status ?? '')
}

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

  const product = await resolveProduct(app.id, planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Subscribers • ${app.name}` }
}

export default async function PlanSubscribersPage({
  params,
  searchParams,
}: Props) {
  const { slug, planSlug } = await params
  const { status } = await searchParams

  // Unknown or missing status resolves to all — never an API error.
  const subscriberStatus = isSubscriberStatus(status) ? status : undefined

  return (
    <div className="space-y-4">
      <ResourceToolbar
        title="Subscribers"
        titleFilter={
          <StatusFilterHeading
            label="Subscribers"
            value={subscriberStatus ?? 'all'}
            options={SUBSCRIBER_STATUS_OPTIONS}
          />
        }
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={SUBSCRIBERS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <PlanSubscribersData params={params} status={subscriberStatus} />
      </Suspense>
    </div>
  )
}

async function PlanSubscribersData({
  params,
  status,
}: {
  params: Props['params']
  status?: string
}) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const product = await resolveProduct(app.id, planSlug)
  if (!product) notFound()

  const [coreSubscriptionsResult, billingStats] = await Promise.all([
    listCompleteAppSubscriptions(app.id),
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
    const coreSubscriptions = coreSubscriptionsResult.data.filter(
      (subscription) =>
        subscription.items.some((item) => item.product_id === product.id)
    )

    const orgIds = [
      ...new Set(
        coreSubscriptions.map((subscription) => subscription.organization_id)
      ),
    ]
    const orgMap = new Map<string, AdminOrganization>()
    await Promise.all(
      orgIds.map(async (organizationId) => {
        const result = await platform.organizations.retrieve({
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

    const subscribers = coreSubscriptions
      .map((subscription) => {
        const organization = orgMap.get(subscription.organization_id)
        const financial = financialByCoreSubscriptionId.get(subscription.id)

        return {
          id: subscription.id,
          name:
            organization?.doing_business_as ??
            organization?.name ??
            financial?.customerName ??
            subscription.organization_id,
          email: organization?.primary_email ?? null,
          status: subscription.status,
          startedAt: subscription.start_date,
          mrr: Number(financial?.monthlyRecurringRevenue ?? '0'),
        }
      })
      .filter((subscriber) => !status || subscriber.status === status)

    return <SubscribersTable subscribers={subscribers} />
  }

  // Degrade to the Billing projection only when Core itself is unavailable.
  // `externalReference` is a Core subscription id, not an email address, so do
  // not display it as contact information.
  const subscribers =
    planStats?.subscribers
      .map((subscriber) => ({
        id: subscriber.subscriptionId,
        name: subscriber.customerName,
        email: null,
        status: subscriber.status,
        startedAt: subscriber.startAt,
        mrr: Number(subscriber.monthlyRecurringRevenue),
      }))
      .filter((subscriber) => !status || subscriber.status === status) ?? []

  return <SubscribersTable subscribers={subscribers} />
}
