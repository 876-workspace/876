import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { AdminApp, AdminOrganization, AdminUser } from '@876/admin'

import { $876 } from '@/lib/876'
import { CONSOLE_APP_SLUG } from '@/lib/console-app'
import { service } from '@/lib/service'
import { FeatureEntitlementsManager } from '../../../../../features/[id]/entitlements/feature-entitlements-manager'
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

  const [organizations, users] = await Promise.all([
    listOrganizationsForApp(app),
    listUsersForApp(app),
  ])

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
      apps={[app]}
      orgRows={orgRows}
      userRows={userRows}
    />
  )
}

async function listOrganizationsForApp(
  app: AdminApp
): Promise<AdminOrganization[]> {
  const subscriptionsResult = await $876.apps.subscriptions.list(app.id)
  if (subscriptionsResult.error) return []

  const organizationIds = [
    ...new Set(
      subscriptionsResult.data
        .filter((subscription) => subscription.status === 'active')
        .map((subscription) => subscription.organization_id)
    ),
  ]

  const organizationResults = await Promise.all(
    organizationIds.map((organizationId) => $876.orgs.retrieve(organizationId))
  )

  return organizationResults
    .map((result) => (result.error ? null : result.data))
    .filter((organization): organization is AdminOrganization =>
      Boolean(organization)
    )
}

async function listUsersForApp(app: AdminApp): Promise<AdminUser[]> {
  if (app.slug === CONSOLE_APP_SLUG) {
    const members = await service.team.list()
    const activeMembers = members.filter((member) => member.status === 'active')
    const userResults = await Promise.all(
      activeMembers.map((member) => $876.users.retrieve(member.userId))
    )

    return userResults
      .map((result) => (result.error ? null : result.data))
      .filter((user): user is AdminUser => Boolean(user))
  }

  const usersResult = await $876.users.list({ limit: 100, status: 'active' })
  if (usersResult.error) return []

  const users = usersResult.data.data
  const appResults = await Promise.all(
    users.map((user) => $876.users.listApps(user.id))
  )

  return users.filter((user, index) => {
    const result = appResults[index]
    if (result.error) return false

    return result.data.data.some(
      (userApp) => userApp.id === app.id || userApp.slug === app.slug
    )
  })
}
