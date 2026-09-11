import { notFound } from 'next/navigation'

import { platform } from '@/lib/services/platform'
import { resolveApp } from '../../_data'
import { PlansList } from './plans-list'

/**
 * Data half of the list column. Rendered from the section layout inside a
 * Suspense boundary, so the toolbar is interactive before this resolves.
 */
export async function PlansListData({ slug }: { slug: string }) {
  const app = await resolveApp(slug)
  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await platform.products.list({ appId: app.id })
  const products = data?.data ?? []

  return <PlansList data={products} appSlug={app.slug} />
}
