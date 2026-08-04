import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminOrganization } from '@876/admin'
import { PageBreadcrumb } from '@876/ui/page'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { SUBSCRIPTIONS_SKELETON_COLUMNS } from './_components/subscriptions-skeleton-columns'

import { $876 } from '@/lib/876'

import {
  resolveOrg,
  resolveOrgBillingAccounts,
  resolveOrgSubscriptions,
} from '../../_data'
import { SubscriptionsManager } from '@/app/(app)/orgs/[slug]/billing/_components/subscriptions-manager'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Billing subscriptions' }
  return {
    title: `${org.name ?? org.slug} • Billing subscriptions - Organizations`,
  }
}

export default async function OrganizationBillingSubscriptionsPage({
  params,
}: Props) {
  const { slug } = await params

  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/billing`}
          label="Billing"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">Subscriptions</h1>
      </div>
      <Suspense
        fallback={
          <DataTableSkeleton columns={SUBSCRIPTIONS_SKELETON_COLUMNS} />
        }
      >
        <BillingSubscriptionsShell slug={slug} />
      </Suspense>
    </div>
  )
}

async function BillingSubscriptionsShell({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return <BillingSubscriptionsData org={org} slug={slug} />
}

async function BillingSubscriptionsData({
  org,
  slug,
}: {
  org: AdminOrganization
  slug: string
}) {
  const [accounts, subscriptions, productsResult] = await Promise.all([
    resolveOrgBillingAccounts(org.id),
    resolveOrgSubscriptions(org.id),
    $876.products.list({ status: 'active' }),
  ])

  return (
    <SubscriptionsManager
      orgSlug={slug}
      accounts={accounts?.data ?? []}
      subscriptions={subscriptions ?? []}
      products={productsResult.data?.data ?? []}
    />
  )
}
