/**
 * OAuth / OIDC scope registry and claim resolver.
 *
 * Single source of truth for the scopes this authorization server supports and
 * the OIDC claims each releases. Discovery (`scopes_supported`,
 * `claims_supported`), UserInfo, and ID-token assembly are all driven from
 * here, so adding a scope or a claim is a data change in this file rather than
 * edits scattered across the routes.
 */

/** Requests a refresh token (long-lived offline access). */
export const OFFLINE_ACCESS_SCOPE = 'offline_access'

/** Standard OIDC claims present in issued tokens regardless of scope. */
export const PROTOCOL_CLAIMS = [
  'iss',
  'sub',
  'aud',
  'exp',
  'iat',
  'auth_time',
  'nonce',
] as const

export type ScopeDefinition = {
  name: string
  description: string
  claims?: readonly string[]
}

/**
 * Ordered so consent screens and discovery list scopes predictably. `sub` is a
 * protocol claim and always present, so `openid` releases no extra claims of
 * its own.
 */
export const SCOPE_REGISTRY: Record<string, ScopeDefinition> = {
  'billing.organizations.read': {
    name: 'billing.organizations.read',
    description:
      'Read Billing workspace details for organizations you can access.',
  },
  'billing.customers.read': {
    name: 'billing.customers.read',
    description: 'Read Billing customers for organizations you can access.',
  },
  'billing.customers.write': {
    name: 'billing.customers.write',
    description:
      'Create and update Billing customers for organizations you can access.',
  },
  'billing.items.read': {
    name: 'billing.items.read',
    description: 'Read Billing catalog items for organizations you can access.',
  },
  'billing.items.write': {
    name: 'billing.items.write',
    description:
      'Create and update Billing catalog items for organizations you can access.',
  },
  'billing.plans.read': {
    name: 'billing.plans.read',
    description: 'Read Billing plans for organizations you can access.',
  },
  'billing.subscriptions.read': {
    name: 'billing.subscriptions.read',
    description: 'Read Billing subscriptions for organizations you can access.',
  },
  'billing.subscriptions.write': {
    name: 'billing.subscriptions.write',
    description:
      'Manage Billing subscriptions for organizations you can access.',
  },
  'billing.invoices.read': {
    name: 'billing.invoices.read',
    description: 'Read Billing invoices for organizations you can access.',
  },
  'billing.invoices.write': {
    name: 'billing.invoices.write',
    description:
      'Create and manage Billing invoices for organizations you can access.',
  },
  'billing.payments.read': {
    name: 'billing.payments.read',
    description: 'Read Billing payments for organizations you can access.',
  },
  'billing.payments.write': {
    name: 'billing.payments.write',
    description: 'Record Billing payments for organizations you can access.',
  },
  openid: {
    name: 'openid',
    description: 'Sign you in with your 876 account.',
  },
  email: {
    name: 'email',
    description: 'Your email address and its verification status.',
    claims: ['email', 'email_verified'],
  },
  profile: {
    name: 'profile',
    description: 'Your name and profile picture.',
    claims: ['name', 'given_name', 'family_name', 'picture'],
  },
  [OFFLINE_ACCESS_SCOPE]: {
    name: OFFLINE_ACCESS_SCOPE,
    description: "Keep you signed in when you're away (refresh tokens).",
  },
}

/** Every scope this server advertises in discovery. */
export function supportedScopes(): string[] {
  return Object.keys(SCOPE_REGISTRY)
}

/** Protocol claims plus every claim releasable by a registered scope. */
export function supportedClaims(): string[] {
  const claims: string[] = [...PROTOCOL_CLAIMS]
  for (const definition of Object.values(SCOPE_REGISTRY))
    for (const claim of definition.claims ?? [])
      if (!claims.includes(claim)) claims.push(claim)

  return claims
}

export function grantsOfflineAccess(scopes: string[]): boolean {
  return scopes.includes(OFFLINE_ACCESS_SCOPE)
}

/** The set of OIDC claim names released by the given scopes. */
export function claimsForScopes(scopes: string[]): Set<string> {
  const granted = new Set<string>()
  for (const scope of scopes)
    for (const claim of SCOPE_REGISTRY[scope]?.claims ?? []) granted.add(claim)

  return granted
}

export type ClaimSource = {
  email: string | null
  emailVerified: boolean | null
  firstName: string | null
  lastName: string | null
  avatar: string | null
}

/**
 * The OIDC identity claims released by the granted scopes.
 *
 * A claim the scopes did not ask for is never added, and `picture` is omitted
 * rather than sent as null — an empty avatar is absence of a picture, not a
 * picture whose value is nothing.
 */
export function resolveIdentityClaims(
  scopes: string[],
  user: ClaimSource
): Record<string, unknown> {
  const wanted = claimsForScopes(scopes)

  const available: Record<string, unknown> = {
    email: user.email,
    email_verified: user.emailVerified,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    given_name: user.firstName,
    family_name: user.lastName,
    picture: user.avatar,
  }

  const claims: Record<string, unknown> = {}
  for (const claim of wanted) {
    const value = available[claim]
    if (claim === 'picture' && !value) continue
    claims[claim] = value
  }

  return claims
}
