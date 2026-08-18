import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { $876 } from '@/lib/876'
import { resolveFeature } from '../../../../features/[id]/_data'
import { resolveApp } from '../../_data'
import { FeatureChildrenPanel } from './_components/feature-children-panel'

type Props = {
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

export default function AppFeatureDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-56 w-full rounded-lg" />}>
      <AppFeatureDetailData params={params} />
    </Suspense>
  )
}

async function AppFeatureDetailData({ params }: Props) {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  const { data: appFeaturesData } = await $876.appFeatures.list(app.id, {
    limit: 100,
  })
  const childFeatures =
    appFeaturesData?.data.filter(
      (childFeature) => childFeature.parent_feature_id === feature.id
    ) ?? []

  return (
    <div className="space-y-4">
      {childFeatures.length > 0 && (
        <FeatureChildrenPanel
          appSlug={slug}
          parentFeature={feature}
          childFeatures={childFeatures}
        />
      )}

      {childFeatures.length === 0 && (
        <section className="border-876-surface-border border-y py-5">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">Flag overview</h3>
            <p className="text-muted-foreground mt-1 max-w-3xl text-[0.8125rem] leading-6">
              {feature.description ||
                'No description has been added for this feature.'}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
