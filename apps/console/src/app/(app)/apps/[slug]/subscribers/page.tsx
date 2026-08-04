import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminApp, AdminOrganization } from '@876/admin'

import { $876 } from '@/lib/876'
import { resolveApp } from '../_data'
import { SubscribersTable } from './_components/subscribers-table'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { SUBSCRIBERS_SKELETON_COLUMNS } from './_components/subscribers-skeleton-columns'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Subscribers' }
  return { title: `${app.name} • Subscribers - Apps` }
}

export default async function AppSubscribersPage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="876-page-title">Subscribers</h2>
      </div>
      <Suspense
        fallback={<DataTableSkeleton columns={SUBSCRIBERS_SKELETON_COLUMNS} />}
      >
        <AppSubscribersShell slug={slug} />
      </Suspense>
    </div>
  )
}

async function AppSubscribersShell({ slug }: { slug: string }) {
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  return <SubscribersTableData app={app} />
}

async function SubscribersTableData({ app }: { app: AdminApp }) {
  const [subscriptionsResult, productsResult] = await Promise.all([
    $876.appSubscriptions.list(app.id),
    $876.products.list({ appId: app.id, status: 'active' }),
  ])
  const subscriptions = subscriptionsResult.data ?? []
  const prices = (productsResult.data?.data ?? []).flatMap((product) =>
    product.prices
      .filter((price) => price.status === 'active')
      .map((price) => ({
        id: price.id,
        label: `${product.name}${price.billing_interval ? ` (${price.billing_interval})` : ''}`,
      }))
  )

  const orgIds = [...new Set(subscriptions.map((s) => s.organization_id))]
  const orgMap = new Map<string, AdminOrganization>()
  await Promise.all(
    orgIds.map(async (id) => {
      const { data: org } = await $876.organizations.retrieve(id)
      if (org) orgMap.set(id, org)
    })
  )

  return (
    <SubscribersTable
      data={subscriptions}
      orgMap={Object.fromEntries(orgMap)}
      prices={prices}
      appSlug={app.slug}
    />
  )
}
