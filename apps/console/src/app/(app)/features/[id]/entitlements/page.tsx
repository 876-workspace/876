import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { resolveFeature } from '../_data'
import { FeatureEntitlementsManager } from './feature-entitlements-manager'

type Props = { params: Promise<{ id: string }> }

const APP_KINDS = ['internal', 'platform', 'product'] as const

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

  const [orgsResult, usersResult, ...appResults] = await Promise.all([
    $876.orgs.list({ limit: 50, status: 'active' }),
    $876.users.list({ limit: 50, status: 'active' }),
    ...APP_KINDS.map((appKind) =>
      $876.apps.list({
        limit: 100,
        appKind,
        clientType: 'public',
        status: 'active',
      })
    ),
  ])

  const apps = appResults
    .flatMap((result) => result.data?.data ?? [])
    .sort((a, b) => a.name.localeCompare(b.name))
  const organizations = orgsResult.data?.data ?? []
  const users = usersResult.data?.data ?? []

  const [orgGrantResults, userGrantResults] = await Promise.all([
    Promise.all(
      organizations.map((organization) =>
        $876.features.orgs.list(organization.id)
      )
    ),
    Promise.all(users.map((user) => $876.users.listFeatures(user.id))),
  ])

  const orgRows = organizations.map((organization, index) => ({
    organization,
    grant:
      orgGrantResults[index].data?.data.find(
        (grant) => grant.feature_id === feature.id
      ) ?? null,
  }))
  const userRows = users.map((user, index) => ({
    user,
    grant:
      userGrantResults[index].data?.data.find(
        (grant) => grant.feature_id === feature.id
      ) ?? null,
  }))

  return (
    <FeatureEntitlementsManager
      feature={feature}
      apps={apps}
      orgRows={orgRows}
      userRows={userRows}
    />
  )
}
