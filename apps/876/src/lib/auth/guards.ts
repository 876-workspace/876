import 'server-only'

import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { unwrapOptional, unwrapResult } from '@876/core/client/lookup'

import { CONSUMER_APP_SLUG } from '@/lib/consumer-app'

import { appUrl, orgWorkspaceUrl } from './app-urls'
import { getAuthRoutingClient } from './auth-routing-client'
import { getAuthSession, isSignedSession } from './session'

// ─── Session ──────────────────────────────────────────────────────────────────

export async function requireSession(returnTo: string) {
  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(createAuthStartPath(returnTo))
  return result.user
}

// ─── User lookup ──────────────────────────────────────────────────────────────

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
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
  }
}

export async function findAuthRoutingUser(
  userId: string
): Promise<AuthRoutingUser | null> {
  const client = await getAuthRoutingClient()
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

// ─── Account guards ────────────────────────────────────────────────────────────

export async function requireActiveUser(
  userId: string
): Promise<AuthRoutingUser> {
  const user = await findAuthRoutingUser(userId)
  if (!user) redirect(appUrl('/app'))
  if (user.banned || user.status !== 'active') redirect(appUrl('/suspended'))
  return user
}

export async function requireOrgMembership(
  userId: string,
  slug: string
): Promise<{ user: AuthRoutingUser; membership: ActiveMembership }> {
  const user = await findAuthRoutingUser(userId)
  if (!user) redirect(appUrl('/app'))

  const membership = await findActiveMembershipBySlug(user.id, slug)
  if (!membership) redirect(appUrl('/app'))

  return { user, membership }
}

async function findActiveMembershipBySlug(
  userId: string,
  slug: string
): Promise<ActiveMembership | null> {
  const client = await getAuthRoutingClient()
  const result = await client.auth.getRoutingMemberships({
    userId,
    orgSlug: slug,
    status: 'active',
  })
  // An empty list is the legitimate "no membership"; an error envelope is a
  // real failure and must not be downgraded to a silent access denial.
  const memberships = unwrapResult(result, 'routing memberships').data
  return memberships.find((m) => m.organization.slug === slug) ?? null
}

// ─── Post-login routing ────────────────────────────────────────────────────────

export async function resolveHomePathForUser(): Promise<string> {
  return appUrl('/app')
}

export async function resolvePrimaryOrganizationPath(
  userId: string
): Promise<string | null> {
  const client = await getAuthRoutingClient()
  const result = await client.auth.getRoutingMemberships({
    userId,
    status: 'active',
  })
  const memberships = unwrapResult(result, 'routing memberships').data
  const first = memberships.find(
    (m) => m.status === 'active' && m.organization.status === 'active'
  )
  return first ? orgWorkspaceUrl(`/org/${first.organization.slug}`) : null
}

// ─── Feature gates ────────────────────────────────────────────────────────────

export async function getEnabledConsumerFeatureSlugs(
  userId: string
): Promise<Set<string>> {
  const client = await getAuthRoutingClient()
  const result = await client.features.evaluate({
    userId,
    appSlug: CONSUMER_APP_SLUG,
  })
  const features = unwrapResult(result, 'consumer features').data
  return new Set(features.map((f) => f.slug))
}

export async function requireConsumerFeature(slug: string): Promise<void> {
  const sessionUser = await requireSession('/app')
  const user = await findAuthRoutingUser(sessionUser.id)

  if (!user) redirect(appUrl('/app'))

  const enabled = await getEnabledConsumerFeatureSlugs(user.id)
  if (!enabled.has(slug)) redirect(appUrl('/app'))
}

export async function canAccessOrganizationSlug(
  userId: string,
  slug: string
): Promise<boolean> {
  const membership = await findActiveMembershipBySlug(userId, slug)
  return membership !== null
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function createAuthStartPath(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `/login?${searchParams.toString()}`
}
