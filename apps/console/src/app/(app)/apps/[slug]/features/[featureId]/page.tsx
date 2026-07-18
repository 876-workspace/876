import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import {
  findFeatureGroupByMasterSlug,
  isFeatureGroupChild,
} from '@/lib/feature-groups'
import { resolveFeature } from '../../../../features/[id]/_data'
import { resolveApp } from '../../_data'
import { FeatureChildrenPanel } from './feature-children-panel'

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

export default async function AppFeatureDetailPage({ params }: Props) {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  const featureGroup = findFeatureGroupByMasterSlug(feature.slug)
  const { data: appFeaturesData } = featureGroup
    ? await $876.apps.features.list(app.id, { limit: 100 })
    : { data: null }
  const childFeatures =
    appFeaturesData?.data.filter((childFeature) =>
      childFeature.parent_feature_id
        ? childFeature.parent_feature_id === feature.id
        : featureGroup
          ? isFeatureGroupChild(featureGroup, childFeature.slug)
          : false
    ) ?? []

  return (
    <div className="space-y-4">
      {featureGroup && (
        <FeatureChildrenPanel
          appSlug={slug}
          parentFeature={feature}
          childFeatures={childFeatures}
        />
      )}

      {!featureGroup && (
        <section className="border-876-surface-border border-y py-5">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">Flag overview</h3>
            <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
              {feature.description ||
                'No description has been added for this feature.'}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
