import 'server-only'

import * as Sentry from '@sentry/nextjs'
import { cache } from 'react'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { toCouriersTenant } from '@/lib/couriers'
import { getPlatformClient } from '@/lib/services/platform'
import { couriersOperator } from '@/lib/services/couriers'
import type { AppAccessStatus, ManageContext, OrgRole } from '@/types/auth'

export const getManageContext = cache(async function getManageContext(
  orgSlug?: string
): Promise<ManageContext | null> {
  const sessionResult = await getAuthSession()
  if (!isSignedSession(sessionResult)) return null

  const user = sessionResult.user
  const platform = await getPlatformClient()
  const membershipsResult = await platform.memberships.listRouting({
    userId: user.id,
    status: 'active',
  })
  if (membershipsResult.error) {
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
  let resolvedRole: OrgRole = 'staff'
  let resolvedTenant: ManageContext['tenant'] = null

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
    const tenant = await couriersOperator.tenants.retrieve({
      organizationId: match.organization.id,
    })
    resolvedTenant = tenant.data ? toCouriersTenant(tenant.data) : null
  } else if (orgId) {
    const match = memberships.find(
      (membership) =>
        membership.organization.id === orgId &&
        membership.organization.status === 'active'
    )
    if (!match) return null
    resolvedOrgId = orgId
    resolvedOrgName = match.organization.name
    resolvedOrgSlug = match.organization.slug
    resolvedOrgLogoUrl = match.organization.logo_url
    resolvedRole = match.role as OrgRole
    const tenant = await couriersOperator.tenants.retrieve({
      organizationId: orgId,
    })
    resolvedTenant = tenant.data ? toCouriersTenant(tenant.data) : null
  } else {
    for (const membership of memberships) {
      if (membership.organization.status !== 'active') continue
      const tenant = await couriersOperator.tenants.retrieve({
        organizationId: membership.organization.id,
      })
      if (tenant.data) {
        resolvedOrgId = membership.organization.id
        resolvedOrgName = membership.organization.name
        resolvedOrgSlug = membership.organization.slug
        resolvedOrgLogoUrl = membership.organization.logo_url
        resolvedRole = membership.role as OrgRole
        resolvedTenant = toCouriersTenant(tenant.data)
        break
      }
    }
    if (!resolvedOrgId) {
      const first = memberships.find(
        (membership) => membership.organization.status === 'active'
      )
      if (!first) return null
      resolvedOrgId = first.organization.id
      resolvedOrgName = first.organization.name
      resolvedOrgSlug = first.organization.slug
      resolvedOrgLogoUrl = first.organization.logo_url
      resolvedRole = first.role as OrgRole
    }
  }

  if (!resolvedOrgId) return null

  const accessResult = await platform.subscriptions.retrieve({
    organizationId: resolvedOrgId,
    appSlug: COURIERS_APP_SLUG,
  })
  if (accessResult.error) {
    Sentry.captureMessage('Platform outage: subscriptions.retrieve failed', {
      level: 'error',
      tags: { category: 'platform_client' },
      extra: {
        call: 'subscriptions.retrieve',
        errorCode: accessResult.error.code ?? null,
        errorMessage: accessResult.error.message ?? null,
        appSlug: COURIERS_APP_SLUG,
        consequence:
          "Access status falls back to 'none', so a subscribed org is treated as unprovisioned.",
      },
    })
  }

  const accessStatus: AppAccessStatus = accessResult.error
    ? 'none'
    : ((accessResult.data?.status as AppAccessStatus) ?? 'none')
  const currentPlanName = accessResult.data?.items?.[0]?.product_name ?? null

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
    ...(currentPlanName ? { currentPlanName } : {}),
  }
})
