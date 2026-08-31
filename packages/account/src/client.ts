import { resolve876ApiBaseUrl } from '@876/core/client'

import { createOAuthMethods } from './oauth.ts'
import { createAppMembershipsResource } from './resources/app-memberships.ts'
import { createAppsResource } from './resources/apps.ts'
import { createAuditEventsResource } from './resources/audit-events.ts'
import { createAuthResource } from './resources/auth-provisioning.ts'
import { createOAuthGrantsResource } from './resources/oauth-grants.ts'
import { createOrgsResource } from './resources/orgs.ts'
import { createUsersResource } from './resources/users.ts'
import { createProductsResource } from './resources/products.ts'
import { createFeaturesResource } from './resources/features.ts'
import { createMobileNumberVerificationsResource } from './resources/mobile-number-verifications.ts'
import { createMobileNumbersResource } from './resources/mobile-numbers.ts'
import type { ClientOptions } from './types/api.ts'
import { auth876ClientOptionsSchema } from './types/api.ts'

/** Env var precedence for the consumer/first-party tier. */
const sdkBaseUrlEnvKeys = ['NEXT_PUBLIC_876_API_URL', 'NEXT_PUBLIC_API_URL']

/**
 * Resolves the 876 API base URL from explicit options or the environment.
 *
 * - Explicit `baseUrl` wins.
 * - `NEXT_PUBLIC_876_API_URL` / `NEXT_PUBLIC_API_URL` are used when present.
 * - Local development and tests fall back to the local FastAPI server.
 * - Production without a URL falls back to the deployed 876 API.
 */
function resolveApiBaseUrl(baseUrl?: string): string {
  return resolve876ApiBaseUrl(baseUrl, sdkBaseUrlEnvKeys)
}

/**
 * Creates a request-only 876 SDK client for auth and OAuth-adjacent app flows.
 * The API base URL is resolved internally from the current runtime; callers do
 * not pass a base URL for the auth client.
 *
 * The client is composed from per-resource factory modules (`src/resources/`)
 * bound to one shared runtime. Only API-key/session-tier (non-`AdminDep`)
 * operations exist here; privileged platform administration lives in
 * `@876/admin` so it never reaches consumer bundles.
 */
export function create876Client(options: ClientOptions = {}) {
  const parsed = auth876ClientOptionsSchema.parse(options)
  const runtime = {
    baseUrl: resolveApiBaseUrl(parsed.baseUrl),
    apiKey: parsed.apiKey,
    accessToken: parsed.accessToken,
    fetch: parsed.fetch ?? globalThis.fetch.bind(globalThis),
    credentials: parsed.credentials,
    collectDeviceSignal: parsed.collectDeviceSignal,
  }

  const oauthConfig = parsed.oauth
  const oauth = createOAuthMethods({
    baseUrl: runtime.baseUrl ?? '',
    clientId: oauthConfig?.clientId ?? '',
    redirectUri: oauthConfig?.redirectUri ?? '',
    clientSecret: oauthConfig?.clientSecret,
    apiKey: runtime.apiKey,
    fetch: runtime.fetch,
    configured: Boolean(oauthConfig) && Boolean(runtime.baseUrl),
  })
  const { memberships, ...users } = createUsersResource(runtime)
  const {
    locations,
    contacts,
    departments,
    employees,
    permissions,
    roles,
    members: organizationMembers,
    appAssignments,
    invites,
    subscriptions,
    ...organizations
  } = createOrgsResource(runtime)

  return {
    auth: createAuthResource(runtime),
    oauth,
    apps: createAppsResource(runtime),
    oauthGrants: createOAuthGrantsResource(runtime),
    auditEvents: createAuditEventsResource(runtime),
    features: createFeaturesResource(runtime),
    users,
    memberships,
    organizations,
    locations,
    contacts,
    departments,
    employees,
    permissions,
    roles,
    organizationMembers,
    appAssignments,
    /** Self-scoped app role and effective-permission reads. */
    appMemberships: createAppMembershipsResource(runtime),
    invites,
    subscriptions,
    products: createProductsResource(runtime),
    mobileNumbers: createMobileNumbersResource(runtime),
    mobileNumberVerifications: createMobileNumberVerificationsResource(runtime),
  }
}

/** The resource-first 876 platform client returned by {@link create876Client}. */
export type SDK876Client = ReturnType<typeof create876Client>

/** The auth namespace of the {@link SDK876Client}; used as the `client` in auth-ui. */
export type SDK876AuthClient = SDK876Client['auth']
