import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminOrganization } from '@876/admin'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { resolveOrg, resolveOrgSubscriptions } from '../../_data'
import { SUBSCRIPTIONS_SKELETON_COLUMNS } from '../_components/subscriptions-skeleton-columns'
import { SubscriptionsTable } from '../_components/subscriptions-table'

const SUBSCRIPTION_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Subscriptions' },
  { value: 'active', label: 'Active', headingLabel: 'Active Subscriptions' },
  { value: 'trialing', label: 'Trialing', headingLabel: 'Trialing Subscriptions' },
  { value: 'past_due', label: 'Past due', headingLabel: 'Past Due Subscriptions' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Subscriptions' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Subscriptions' },
]

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
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
  const { slug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status && SUBSCRIPTION_STATUS_OPTIONS.some((o) => o.value === status)
      ? status
      : 'all'

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
        fallback={<DataTableSkeleton columns={SUBSCRIPTIONS_SKELETON_COLUMNS} />}
      >
        <SubscriptionsShell slug={slug} status={selectedStatus} />
      </Suspense>
    </div>
  )
}

async function SubscriptionsShell({
  slug,
  status,
}: {
  slug: string
  status: string
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <SubscriptionsData org={org} status={status} />
}

async function SubscriptionsData({
  org,
  status,
}: {
  org: AdminOrganization
  status: string
}) {
  const subscriptions = await resolveOrgSubscriptions(org.id)
  const filtered =
    status === 'all'
      ? (subscriptions ?? [])
      : (subscriptions ?? []).filter((sub) => sub.status === status)

  return <SubscriptionsTable subscriptions={filtered} />
}
