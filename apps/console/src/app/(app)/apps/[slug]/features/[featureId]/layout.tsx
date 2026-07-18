import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { AdminApp } from '@876/admin'

import type { RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { FeatureHeader } from '../../../../features/[id]/feature-header'
import { resolveFeature } from '../../../../features/[id]/_data'
import { resolveApp } from '../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string; featureId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id)
    return { title: 'Feature not found' }

  return { title: `${feature.name} - ${app.name} Features` }
}

export default async function AppFeatureDetailLayout({
  children,
  params,
}: Props) {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  const apps: AdminApp[] = [app]
  const base = `/apps/${slug}/features/${featureId}`
  const returnHref = `/apps/${slug}/features`
  const tabs: DetailTab[] = [
    { label: 'Details', href: base, exact: true },
    { label: 'Access', href: `${base}/access` },
    { label: 'Rules & Values', href: `${base}/config` },
    { label: 'History', href: `${base}/audit` },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <FeatureHeader
          feature={feature}
          apps={apps}
          tabs={tabs}
          appSlug={slug}
          returnHref={returnHref}
          isNested={true}
        />
      </div>

      {children}
    </div>
  )
}
