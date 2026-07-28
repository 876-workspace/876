import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FeatureAccessBoard } from '@/components/access/feature-access-board'
import { loadGrants, toAccessFlag } from '@/components/access/to-access-flag'
import { $876 } from '@/lib/876'
import { resolveFeature } from '../_data'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const feature = await resolveFeature(id)
  if (!feature) return { title: 'Entitlements' }
  return { title: `${feature.name} • Entitlements - Features` }
}

export default async function FeatureEntitlementsPage({ params }: Props) {
  const { id } = await params
  const feature = await resolveFeature(id)
  if (!feature) notFound()

  // Children AND with this flag, so they belong on the same screen — an admin
  // reading "enabled" here needs to see what that does and does not switch on.
  const [siblingsResult, appsResult] = await Promise.all([
    $876.features.list({ limit: 100, appId: feature.app_id ?? undefined }),
    $876.apps.list({ limit: 100, clientType: 'public' }),
  ])
  const children = (siblingsResult.data?.data ?? []).filter(
    (entry) => entry.parent_feature_id === feature.id
  )

  const app = feature.app_id
    ? (appsResult.data?.data ?? []).find((entry) => entry.id === feature.app_id)
    : null

  const family = [feature, ...children]
  const grantsById = await loadGrants(family, (id) =>
    $876.features.retrieveGrants(id)
  )

  return (
    <FeatureAccessBoard
      scopes={[
        {
          key: app?.slug ?? 'platform',
          label: app?.name ?? 'All apps',
          logoUrl: app?.logo_url ?? null,
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
