import 'server-only'

import { cache } from 'react'
import * as Sentry from '@sentry/nextjs'

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
  if (membershipsResult.error) {
    // Returning null is indistinguishable from "this user belongs to no org",
    // which routes a fully provisioned member to onboarding. Report the cause.
    Sentry.captureMessage(
      'Platform outage: auth.getRoutingMemberships failed',
      {
        level: 'error',
        tags: { category: 'platform_client' },
        extra: {
          call: 'auth.getRoutingMemberships',
          errorCode: membershipsResult.error.code ?? null,
          errorMessage: membershipsResult.error.message ?? null,
          consequence:
            'Manage context resolves to null, so the member is routed to onboarding.',
        },
      }
    )
    return null
  }

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
      logoUrl: membership.organization.logo_url,
    }))
  const orgId = user.orgId ?? null

  let resolvedOrgId: string | null = null
  let resolvedOrgName: string | null = null
  let resolvedOrgSlug: string | null = null
  let resolvedOrgLogoUrl: string | null = null
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
    resolvedOrgLogoUrl = match.organization.logo_url
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
    resolvedOrgLogoUrl = match.organization.logo_url
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
        resolvedOrgLogoUrl = m.organization.logo_url
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
      resolvedOrgLogoUrl = first.organization.logo_url
      resolvedRole = first.role as OrgRole
    }
  }

  if (!resolvedOrgId) return null

  const accessResult = await platform.orgs.subscriptions.retrieveBySlug(
    resolvedOrgId,
    COURIERS_APP_SLUG
  )
  if (accessResult.error) {
    // 'none' is also the legitimate answer for an org that was never
    // provisioned, so an outage silently revokes access for a subscribed org.
    Sentry.captureMessage(
      'Platform outage: orgs.subscriptions.retrieveBySlug failed',
      {
        level: 'error',
        tags: { category: 'platform_client' },
        extra: {
          call: 'orgs.subscriptions.retrieveBySlug',
          errorCode: accessResult.error.code ?? null,
          errorMessage: accessResult.error.message ?? null,
          appSlug: COURIERS_APP_SLUG,
          consequence:
            "Access status falls back to 'none', so a subscribed org is treated as unprovisioned.",
        },
      }
    )
  }

  const accessStatus: AppAccessStatus = accessResult.error
    ? 'none'
    : ((accessResult.data?.status as AppAccessStatus) ?? 'none')

  return {
    userId: user.id,
    orgId: resolvedOrgId,
    orgName: resolvedOrgName,
    orgSlug: resolvedOrgSlug,
    orgLogoUrl: resolvedOrgLogoUrl,
    organizations,
    tenant: resolvedTenant,
    role: resolvedRole,
    accessStatus,
  }
})
