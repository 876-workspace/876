import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FeatureAccessBoard } from '@/components/access/feature-access-board'
import { loadGrants, toAccessFlag } from '@/components/access/to-access-flag'
import { $876 } from '@/lib/876'
import { resolveFeature } from '../../../../../features/[id]/_data'
import { resolveApp } from '../../../_data'

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
    return { title: 'Feature access' }

  return { title: `${feature.name} • Access - ${app.name} Features` }
}

export default async function AppFeatureAccessPage({ params }: Props) {
  const { slug, featureId } = await params
  const [app, feature] = await Promise.all([
    resolveApp(slug),
    resolveFeature(featureId),
  ])
  if (!app || !feature || feature.app_id !== app.id) notFound()

  // Children AND with this flag, so they belong on the same screen.
  const siblingsResult = await $876.features.list({ limit: 100, appId: app.id })
  const children = (siblingsResult.data?.data ?? []).filter(
    (entry) => entry.parent_feature_id === feature.id
  )

  const family = [feature, ...children]
  const grantsById = await loadGrants(family, (id) =>
    $876.features.retrieveGrants(id)
  )

  return (
    <FeatureAccessBoard
      scopes={[
        {
          key: app.slug,
          label: app.name,
          logoUrl: app.logo_url ?? null,
          flags: [
            toAccessFlag(feature, grantsById.get(feature.id) ?? null, false),
            ...children.map((child) =>
              toAccessFlag(child, grantsById.get(child.id) ?? null, true)
            ),
          ],
        },
      ]}
    />
  )
}
