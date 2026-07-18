import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { AdminApp } from '@876/admin'

import { $876 } from '@/lib/876'
import type { RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { resolveFeature } from './_data'
import { FeatureHeader } from './feature-header'

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
  const [feature, appsResult] = await Promise.all([
    resolveFeature(id),
    $876.apps.list({ appKind: 'internal', limit: 100 }),
  ])
  if (!feature) notFound()

  const apps: AdminApp[] = appsResult.data?.data ?? []

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
