import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPlatformClient } from '@/lib/clients/platform'
import { BILLING_APP_SLUG } from '@/lib/billing-app'
import { getFeatures } from '@/lib/features'
import { service } from '@/lib/service'
import type { Context, OrgRole } from '@/types/auth'
import type { Permission } from '@/types/access'
import type { BillingProductFeature } from '@/types/features'
import type { Tenant } from '@/types/tenant'

import { getAuthSession, isSignedSession } from './session'

function toAccessStatus(
  status: string | null | undefined
): Context['accessStatus'] {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'blocked') return 'blocked'
  return 'none'
}

async function resolveBillingAccessStatus(
  platform: Awaited<ReturnType<typeof getPlatformClient>>,
  organizationId: string
): Promise<Context['accessStatus']> {
  try {
    const subscription = await platform.subscriptions.retrieve({
      organizationId,
      appSlug: BILLING_APP_SLUG,
    })
    if (subscription.error) return 'none'

    // Only a platform block is restricted access. A canceled or past-due
    // subscription stays re-activatable by a super admin or admin, so it is
    // setup rather than a blocked state.
    return toAccessStatus(subscription.data?.status)
  } catch {
    return 'none'
  }
}

export const getContext = cache(
  async function getContext(): Promise<Context | null> {
    const session = await getAuthSession()
    if (!isSignedSession(session)) return null

    const platform = await getPlatformClient()
    const membershipsResult = await platform.memberships.listRouting({
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

    const tenants = await service.tenants.list({
      organizationIds: memberships.map(
        (membership) => membership.organization.id
      ),
    })
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
    const tenant = tenantByOrganizationId.get(organizationId) ?? null
    const role = normalizeOrgRole(selectedMembership.role)
    const accessPromise = tenant
      ? service.members.resolve(tenant.id, session.user.id, role)
      : Promise.resolve(null)
    // Workspace membership governs what a user can do inside the workspace;
    // the platform subscription governs whether the Billing application opens.
    const [access, accessStatus] = await Promise.all([
      accessPromise,
      resolveBillingAccessStatus(platform, organizationId),
    ])

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
): role is Extract<OrgRole, 'super-admin' | 'admin'> {
  return role === 'super-admin' || role === 'admin'
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
  if (role === 'super-admin' || role === 'super_admin') return 'super-admin'
  if (role === 'admin') return 'admin'
  return 'staff'
}
