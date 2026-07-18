import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { BILLING_APP_SLUG } from '@/lib/billing-app'
import { getPlatformClient } from '@/lib/876/platform-client'
import { getFeatures } from '@/lib/features'
import { service } from '@/lib/service'
import type { Tenant } from '@/lib/db'
import type { AccessStatus, Context, OrgRole } from '@/types/auth'
import type { Permission } from '@/types/access'
import type { BillingProductFeature } from '@/types/features'

import { getAuthSession, isSignedSession } from './session'

export const getContext = cache(
  async function getContext(): Promise<Context | null> {
    const session = await getAuthSession()
    if (!isSignedSession(session)) return null

    const platform = await getPlatformClient()
    const membershipsResult = await platform.auth.getRoutingMemberships({
      userId: session.user.id,
      status: 'active',
    })
    if (membershipsResult.error) return null

    const memberships = membershipsResult.data.data.filter(
      (membership) => membership.organization.status === 'active'
    )
    if (memberships.length === 0) return null

    const organizations = memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: normalizeOrgRole(membership.role),
    }))
    const activeOrganizationId = (await cookies()).get(
      'billing_active_org'
    )?.value
    const cookieMembership = activeOrganizationId
      ? memberships.find(
          (membership) => membership.organization.id === activeOrganizationId
        )
      : undefined

    const tenants = await service.tenants.listByOrganizationIds(
      memberships.map((membership) => membership.organization.id)
    )
    const tenantByOrganizationId = new Map(
      tenants.flatMap((tenant) =>
        tenant.organizationId ? [[tenant.organizationId, tenant] as const] : []
      )
    )
    const preferredMembership = memberships.find(
      (membership) => membership.organization.id === session.user.orgId
    )
    const selectedMembership =
      cookieMembership ??
      preferredMembership ??
      memberships.find((membership) =>
        tenantByOrganizationId.has(membership.organization.id)
      ) ??
      memberships[0]
    if (!selectedMembership) return null

    const organizationId = selectedMembership.organization.id
    const accessResult = await platform.orgs.subscriptions.retrieveBySlug(
      organizationId,
      BILLING_APP_SLUG
    )
    const accessStatus: AccessStatus = accessResult.error
      ? 'none'
      : accessResult.data?.items.length
        ? ((accessResult.data.status as AccessStatus) ?? 'none')
        : 'none'

    const tenant = tenantByOrganizationId.get(organizationId) ?? null
    const role = normalizeOrgRole(selectedMembership.role)
    const access =
      tenant && accessStatus === 'active'
        ? await service.members.resolve(tenant.id, session.user.id, role)
        : null

    return {
      userId: session.user.id,
      orgId: organizationId,
      orgName: selectedMembership.organization.name,
      orgSlug: selectedMembership.organization.slug,
      role,
      organizations,
      accessStatus,
      tenant,
      access,
      permissions: access?.status === 'ACTIVE' ? access.permissions : [],
    }
  }
)

/** A context narrowed to an existing Billing workspace. */
export async function getWorkspaceContext(): Promise<
  | (Context & {
      tenant: Tenant
      access: NonNullable<Context['access']>
    })
  | null
> {
  const context = await getContext()
  if (
    !context?.tenant ||
    context.accessStatus !== 'active' ||
    !context.access ||
    context.access.status !== 'ACTIVE' ||
    !context.permissions.includes('billing:access')
  )
    return null
  return context as Context & {
    tenant: Tenant
    access: NonNullable<Context['access']>
  }
}

/** Setup shares the same authenticated organization context. */
export const getSetupContext = getContext

export function canManageBilling(
  role: OrgRole
): role is Extract<OrgRole, 'owner' | 'admin'> {
  return role === 'owner' || role === 'admin'
}

export function hasPermission(
  context: Pick<Context, 'permissions'>,
  permission: Permission
): boolean {
  return context.permissions.includes(permission)
}

/** Authoritative RSC gate for pages that read Billing-local data directly. */
export async function requirePagePermission(permission: Permission) {
  const context = await getWorkspaceContext()
  if (!context || !hasPermission(context, permission))
    redirect('/no-access?reason=permission')
  return context
}

/** Authoritative RSC gate for Billing product features. */
export async function requireBillingFeature(feature: BillingProductFeature) {
  const context = await getWorkspaceContext()
  if (!context) redirect('/no-access')

  const { productFeatures } = await getFeatures({
    userId: context.userId,
    organizationId: context.orgId,
  })
  if (!productFeatures[feature]) redirect('/')

  return context
}

export function normalizeOrgRole(role: string): OrgRole {
  if (role === 'owner' || role === 'admin') return role
  return 'member'
}
