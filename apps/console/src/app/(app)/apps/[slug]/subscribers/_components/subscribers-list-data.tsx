import { notFound } from 'next/navigation'
import type { AdminOrganization } from '@876/platform/compat'

import { platform } from '@/lib/clients/platform'
import { listCompleteAppSubscriptions, resolveApp } from '../../_data'
import { SubscribersList } from './subscribers-list'

/**
 * Data half of the list column. Rendered from the section layout inside a
 * Suspense boundary, so the toolbar is interactive before this resolves.
 */
export async function SubscribersListData({ slug }: { slug: string }) {
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const [subscriptionsResult, productsResult] = await Promise.all([
    listCompleteAppSubscriptions(app.id),
    platform.products.list({ appId: app.id, status: 'active' }),
  ])
  const subscriptions = subscriptionsResult.data
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
      const { data: org } = await platform.organizations.retrieve({ id })
      if (org) orgMap.set(id, org)
    })
  )

  return (
    <SubscribersList
      data={subscriptions}
      orgMap={Object.fromEntries(orgMap)}
      prices={prices}
      appSlug={app.slug}
    />
  )
}
