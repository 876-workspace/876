import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminOrganization, AdminSubscriptionStatus } from '@876/admin'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import {
  resolveOrg,
  resolveOrgBillingAccounts,
  resolveOrgSubscriptions,
} from '../../_data'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { SUBSCRIPTIONS_SKELETON_COLUMNS } from '../_components/subscriptions-skeleton-columns'
import {
  isSubscriptionStatus,
  SUBSCRIPTION_STATUS_OPTIONS,
} from '../_components/subscription-status-options'
import { SubscriptionsSplit } from '../_components/subscriptions-split'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ subscription?: string; status?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Subscriptions' }
  return {
    title: `${org.name ?? org.slug} • Subscriptions - Organizations`,
  }
}

export default async function OrganizationSubscriptionsPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, { subscription, status }] = await Promise.all([
    params,
    searchParams,
  ])
  const selectedStatus =
    SUBSCRIPTION_STATUS_OPTIONS.find((option) => option.value === status)
      ?.value ?? 'all'

  return (
    <div>
      <ResourceToolbar
        title="Subscriptions"
        titleFilter={
          <StatusFilterHeading
            label="Subscriptions"
            value={selectedStatus}
            options={SUBSCRIPTION_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/orgs/${slug}/subscriptions/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={SUBSCRIPTIONS_SKELETON_COLUMNS}
            rows={5}
          />
        }
      >
        <SubscriptionsShell
          slug={slug}
          selectedId={subscription}
          status={
            isSubscriptionStatus(selectedStatus) ? selectedStatus : undefined
          }
        />
      </Suspense>
    </div>
  )
}

async function SubscriptionsShell({
  slug,
  selectedId,
  status,
}: {
  slug: string
  selectedId?: string
  status?: AdminSubscriptionStatus
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <SubscriptionsData
      org={org}
      slug={slug}
      selectedId={selectedId}
      status={status}
    />
  )
}

async function SubscriptionsData({
  org,
  slug,
  selectedId,
  status,
}: {
  org: AdminOrganization
  slug: string
  selectedId?: string
  status?: AdminSubscriptionStatus
}) {
  const [subscriptions, billingAccountsResult] = await Promise.all([
    resolveOrgSubscriptions(org.id, status),
    resolveOrgBillingAccounts(org.id),
  ])

  const billingAccounts: Record<string, string> = {}
  for (const account of billingAccountsResult?.data ?? []) {
    const label = account.name || account.email
    if (label) billingAccounts[account.id] = label
  }

  return (
    <SubscriptionsSplit
      subscriptions={subscriptions ?? []}
      billingAccounts={billingAccounts}
      selectedId={selectedId}
      basePath={`/orgs/${slug}/subscriptions`}
    />
  )
}
