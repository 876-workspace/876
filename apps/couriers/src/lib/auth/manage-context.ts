import 'server-only'

import { cache } from 'react'

import { getPlatformClient } from '@/lib/876/platform-client'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { service } from '@/lib/service'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import type { ManageContext, OrgRole, AppAccessStatus } from '@/types/auth'
import type { Tenant } from '@/lib/db'

export const getManageContext = cache(async function getManageContext(
  orgSlug?: string
): Promise<ManageContext | null> {
  const sessionResult = await getAuthSession()
  if (!isSignedSession(sessionResult)) return null

  const user = sessionResult.user

  const platform = await getPlatformClient()

  // Resolve org and role via getRoutingMemberships for both SSO and email paths.
  const membershipsResult = await platform.auth.getRoutingMemberships({
    userId: user.id,
    status: 'active',
  })
  if (membershipsResult.error) return null

  const memberships = membershipsResult.data.data
  const organizations = memberships
    .filter(
      (membership) =>
        membership.status === 'active' &&
        membership.organization.status === 'active'
    )
    .map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role as OrgRole,
    }))
  const orgId = user.orgId ?? null

  let resolvedOrgId: string | null = null
  let resolvedOrgName: string | null = null
  let resolvedOrgSlug: string | null = null
  let resolvedRole: OrgRole = 'member'
  let resolvedTenant: Tenant | null = null

  if (orgSlug !== undefined) {
    const match = memberships.find(
      (membership) =>
        membership.status === 'active' &&
        membership.organization.slug === orgSlug &&
        membership.organization.status === 'active'
    )
    if (!match) return null

    resolvedOrgId = match.organization.id
    resolvedOrgName = match.organization.name
    resolvedOrgSlug = match.organization.slug
    resolvedRole = match.role as OrgRole
    resolvedTenant = await service.tenants.retrieveByOrgId(
      match.organization.id
    )
  } else if (orgId) {
    // SSO fast path: orgId sealed in cookie; find matching membership for role.
    const match = memberships.find(
      (m) => m.organization.id === orgId && m.organization.status === 'active'
    )
    if (!match) return null
    resolvedOrgId = orgId
    resolvedOrgName = match.organization.name
    resolvedOrgSlug = match.organization.slug
    resolvedRole = match.role as OrgRole
    resolvedTenant = await service.tenants.retrieveByOrgId(orgId)
  } else {
    // Email login: pick first active org with a courier tenant; fall back to first active org.
    for (const m of memberships) {
      if (m.organization.status !== 'active') continue
      const tenant = await service.tenants.retrieveByOrgId(m.organization.id)
      if (tenant) {
        resolvedOrgId = m.organization.id
        resolvedOrgName = m.organization.name
        resolvedOrgSlug = m.organization.slug
        resolvedRole = m.role as OrgRole
        resolvedTenant = tenant
        break
      }
    }
    if (!resolvedOrgId) {
      const first = memberships.find((m) => m.organization.status === 'active')
      if (!first) return null
      resolvedOrgId = first.organization.id
      resolvedOrgName = first.organization.name
      resolvedOrgSlug = first.organization.slug
      resolvedRole = first.role as OrgRole
    }
  }

  if (!resolvedOrgId) return null

  const accessResult = await platform.orgs.subscriptions.retrieveBySlug(
    resolvedOrgId,
    COURIERS_APP_SLUG
  )
  const accessStatus: AppAccessStatus = accessResult.error
    ? 'none'
    : ((accessResult.data?.status as AppAccessStatus) ?? 'none')

  return {
    userId: user.id,
    orgId: resolvedOrgId,
    orgName: resolvedOrgName,
    orgSlug: resolvedOrgSlug,
    organizations,
    tenant: resolvedTenant,
    role: resolvedRole,
    accessStatus,
  }
})
