import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { AdminApp } from '@876/admin'

import { $876 } from '@/lib/876'
import type { RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { resolveFeature } from './_data'
import { FeatureHeader } from '@/features/access/components/feature-header'

type Props = {
  children: ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const feature = await resolveFeature(id)
  if (!feature) return { title: 'Feature not found' }
  return { title: `${feature.name} - Features` }
}

export default async function FeatureDetailLayout({ children, params }: Props) {
  const { id } = await params

  // Only the feature lookup blocks — it decides notFound(). The app list feeds
  // the actions toolbar alone, and awaiting it here would suppress loading.tsx
  // for every route beneath this layout, so it is passed down unresolved and
  // unwrapped behind the toolbar's own Suspense boundary.
  const apps: Promise<AdminApp[]> = $876.apps
    .list({ appKind: 'internal', limit: 100 })
    .then((result) => result.data?.data ?? [])

  const feature = await resolveFeature(id)
  if (!feature) notFound()

  const base = `/features/${id}`
  const tabs: DetailTab[] = [
    { label: 'Details', href: base, exact: true },
    { label: 'Entitlements', href: `${base}/entitlements` },
  ]

  return (
    <div>
      <FeatureHeader feature={feature} apps={apps} tabs={tabs} />

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
