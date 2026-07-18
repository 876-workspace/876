import 'server-only'

import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { unwrapOptional, unwrapResult } from '@876/admin'

import { ENTERPRISE_APP_SLUG } from '@/lib/enterprise-app'

import { getAdminClient } from './admin-client'
import { consumerUrl } from './app-urls'
import { getAuthSession, isSignedSession } from './session'

export { consumerUrl }

export async function requireSession(returnTo: string) {
  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(createLoginRedirectUrl(returnTo))

  // Realm gate (relocated from the Edge proxy — needs the Node runtime): the
  // enterprise workspace admits enterprise accounts ONLY. A consumer-realm
  // (personal) session lands on `/access-denied`; cross-realm accounts (owner +
  // curated super admins) are exempt and pass.
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

type ActiveMembership = {
  id: string
  role: string
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
  userId: string
): Promise<AuthRoutingUser | null> {
  const client = await getAdminClient()
  const result = looksLikeWorkosUserId(userId)
    ? await client.users.retrieveByWorkosId(userId)
    : await client.users.retrieve(userId)

  // Distinguish a real "user not found" (safe to treat as no account) from a
  // transient/server error, which throws rather than silently denying access.
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

function looksLikeWorkosUserId(userId: string): boolean {
  return /^user_[0-9A-HJKMNP-TV-Z]{26}$/.test(userId)
}

export async function requireActiveUser(
  userId: string
): Promise<AuthRoutingUser> {
  const user = await findAuthRoutingUser(userId)
  if (!user) redirect(consumerUrl('/app'))
  if (user.banned || user.status !== 'active')
    redirect(consumerUrl('/suspended'))
  return user
}

export async function requireOrgMembership(
  userId: string,
  slug: string
): Promise<{ user: AuthRoutingUser; membership: ActiveMembership }> {
  const user = await findAuthRoutingUser(userId)
  if (!user) redirect(consumerUrl('/app'))

  const membership = await findActiveMembershipBySlug(user.id, slug)
  if (!membership) redirect(`/no-access?slug=${encodeURIComponent(slug)}`)

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
  userId: string,
  slug: string
): Promise<ActiveMembership | null> {
  const client = await getAdminClient()
  const result = await client.auth.getRoutingMemberships({
    userId,
    orgSlug: slug,
    status: 'active',
  })
  // An empty list is the legitimate "no membership"; an error envelope is a real
  // failure and must not be downgraded to a silent access denial.
  const memberships = unwrapResult(result, 'routing memberships').data
  return memberships.find((m) => m.organization.slug === slug) ?? null
}

export async function resolvePrimaryOrganizationPath(
  userId: string
): Promise<string | null> {
  const client = await getAdminClient()
  const result = await client.auth.getRoutingMemberships({
    userId,
    status: 'active',
  })
  const memberships = unwrapResult(result, 'routing memberships').data
  const first = memberships.find(
    (m) => m.status === 'active' && m.organization.status === 'active'
  )
  // Same-app destination → relative path. The browser keeps its current
  // (externally-correct) origin, so this works on Codespaces/Gitpod/Ona/prod
  // without any origin resolution. Never build an absolute same-app redirect.
  // Land on the member's profile — the enterprise app is an account/ERM
  // surface, so the personal profile is the default post-auth destination.
  return first ? `/${first.organization.slug}/profile` : null
}

export async function resolveHomePathForUser(
  user: AuthRoutingUser
): Promise<string> {
  const orgPath = await resolvePrimaryOrganizationPath(user.id)
  if (orgPath) return orgPath

  return '/no-access'
}

export async function getEnabledEnterpriseFeatureSlugs(
  organizationId?: string
): Promise<Set<string>> {
  const client = await getAdminClient()
  const result = await client.features.evaluate({
    organizationId,
    appSlug: ENTERPRISE_APP_SLUG,
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

function createLoginRedirectUrl(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  // Embedded auth: the org workspace hosts its own login surface.
  return `/login?${searchParams.toString()}`
}
