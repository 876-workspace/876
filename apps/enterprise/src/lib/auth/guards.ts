import 'server-only'

import { createAuthLoginPath } from '@876/core/auth/return-to'
import { unwrapOptional, unwrapResult } from '@876/core/client/lookup'
import * as Sentry from '@sentry/nextjs'
import { redirect } from 'next/navigation'

import { ENTERPRISE_APP_SLUG } from '@/lib/enterprise-app'
import { getAccount } from '@/lib/clients/account-server'
import { getWorkspace } from '@/lib/clients/workspace'

import { consumerUrl } from './app-urls'
import { getAuthSession, isSignedSession } from './session'

export type EnterpriseOrgRole = 'super-admin' | 'admin' | 'staff'

export function normalizeOrgRole(role: string): EnterpriseOrgRole {
  if (
    role === 'super-admin' ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'owner'
  )
    return 'super-admin'
  if (role === 'admin') return 'admin'
  return 'staff'
}

export async function requireSession(returnTo: string) {
  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(createAuthLoginPath(returnTo))

  // Realm gate (relocated from the Edge proxy — needs the Node runtime): only
  // Enterprise accounts may enter this app. Curated cross-realm super admins
  // are exempt and pass.
  const { realm, crossRealm } = result.user
  if (realm !== 'enterprise' && !crossRealm) redirect('/access-denied')

  return result.user
}

type AuthRoutingUser = {
  id: string
  status: string
  banned: boolean
  firstName: string | null
  lastName: string | null
  email: string
  avatar: string | null
}

export type ActiveMembership = {
  id: string
  role: EnterpriseOrgRole
  status: string
  permissions: string[]
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
  }
}

export function hasOrgPermission(
  membership: { permissions: string[] },
  permission: string
): boolean {
  return membership.permissions.includes(permission)
}

export async function requireOrgPermission(
  userId: string,
  slug: string,
  permission: string
): Promise<{ user: AuthRoutingUser; membership: ActiveMembership }> {
  const result = await requireOrgMembership(userId, slug)
  if (!hasOrgPermission(result.membership, permission)) redirect(`/${slug}`)

  return result
}

export async function findAuthRoutingUser(
  _userId: string
): Promise<AuthRoutingUser | null> {
  const account = await getAccount()
  const result = await account.users.retrieve()

  // A session-scoped account client can only retrieve its signed-in user. The
  // requested id comes from that sealed session and is retained for callers'
  // existing contract; the live response remains the source of account state.
  const row = unwrapOptional(result, 'auth routing user')
  if (!row) return null
  if (!row.id || !row.email) return null

  return {
    id: row.id,
    status: row.status ?? 'active',
    banned: Boolean(row.banned),
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    email: row.email,
    avatar: row.avatar ?? null,
  }
}

export async function requireActiveUser(
  userId: string
): Promise<AuthRoutingUser> {
  const user = await findAuthRoutingUser(userId)
  if (!user) redirect(createAuthLoginPath('/'))
  if (user.banned || user.status !== 'active')
    redirect(consumerUrl('/suspended'))

  return user
}

export async function requireOrgMembership(
  userId: string,
  slug: string
): Promise<{ user: AuthRoutingUser; membership: ActiveMembership }> {
  const user = await findAuthRoutingUser(userId)
  if (!user) redirect(createAuthLoginPath(`/${slug}`))

  const membership = await findActiveMembershipBySlug(user.id, slug)
  if (!membership) redirect('/')

  return { user, membership }
}

/**
 * Non-redirecting membership resolver for route handlers, which return JSON
 * status codes rather than redirects. Resolves the session user id to the real
 * user, then looks up their active membership in `slug`. Returns null when the
 * user or membership is absent.
 */
export async function findActiveOrgMembership(
  sessionUserId: string,
  slug: string
): Promise<ActiveMembership | null> {
  const user = await findAuthRoutingUser(sessionUserId)
  if (!user) return null

  return findActiveMembershipBySlug(user.id, slug)
}

async function findActiveMembershipBySlug(
  _userId: string,
  slug: string
): Promise<ActiveMembership | null> {
  const client = await getWorkspace()
  const result = await client.memberships.list({ status: 'active' })
  // An empty list is the legitimate "no membership"; an error envelope is a real
  // failure and must not be downgraded to a silent access denial.
  const memberships = unwrapResult(result, 'routing memberships').data
  const membership = memberships.find((m) => m.organization.slug === slug)
  if (!membership) return null

  return {
    ...membership,
    role: normalizeOrgRole(membership.role),
  }
}

export async function resolvePrimaryOrganizationPath(
  _userId: string
): Promise<string | null> {
  const client = await getWorkspace()
  const result = await client.memberships.list({ status: 'active' })
  const memberships = unwrapResult(result, 'routing memberships').data
  const first = memberships.find(
    (m) => m.status === 'active' && m.organization.status === 'active'
  )
  // Same-app destination → relative path. The browser keeps its current
  // (externally-correct) origin, so this works in local and production
  // without any origin resolution. Never build an absolute same-app redirect.
  // Land on the member's profile — the enterprise app is an account/ERM
  // surface, so the personal profile is the default post-auth destination.
  return first ? `/${first.organization.slug}/profile` : null
}

export async function resolveHomePathForUser(userId: string): Promise<string> {
  const orgPath = await resolvePrimaryOrganizationPath(userId)
  if (orgPath) return orgPath

  // An authenticated social account has no 876 password to submit to
  // `/register`. Its organization must be created through the session-backed
  // onboarding transport instead.
  return '/onboarding'
}

export async function getEnabledEnterpriseFeatureSlugs(
  organizationId?: string
): Promise<Set<string>> {
  const client = await getWorkspace()
  const result = await client.features.evaluate({
    organizationId,
    appSlug: ENTERPRISE_APP_SLUG,
  })
  if (result.error)
    Sentry.captureMessage('Feature flag outage: features.evaluate failed', {
      level: 'error',
      tags: { category: 'feature-flags' },
      extra: {
        call: 'features.evaluate',
        errorCode: result.error.code,
        errorMessage: result.error.message,
        appSlug: ENTERPRISE_APP_SLUG,
      },
    })

  const features = unwrapResult(result, 'enterprise features').data
  return new Set(features.map((f) => f.slug))
}

export async function requireEnterpriseFeature(
  slug: string,
  organizationId?: string,
  redirectPath = '/no-access'
): Promise<void> {
  const slugs = await getEnabledEnterpriseFeatureSlugs(organizationId)
  if (!slugs.has(slug)) redirect(redirectPath)
}
