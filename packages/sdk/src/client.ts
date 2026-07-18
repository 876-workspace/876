import { resolve876ApiBaseUrl } from '@876/core/client'

import { createOAuthMethods } from './oauth.ts'
import { createAppsResource } from './resources/apps.ts'
import { createAuditEventsResource } from './resources/audit-events.ts'
import { createAuthResource } from './resources/auth.ts'
import { createOAuthGrantsResource } from './resources/oauth-grants.ts'
import { createOrgsResource } from './resources/orgs.ts'
import { createUsersResource } from './resources/users.ts'
import { createProductsResource } from './resources/products.ts'
import { createBillingResource } from './resources/billing.ts'
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
 *
 * @param options - Optional client configuration (`apiKey`, `fetch`, `credentials`).
 * @returns A namespaced client. `$876.auth.*` is implemented; `$876.users.*`
 * and `$876.orgs.*` are reserved for future SDK resource namespaces.
 *
 * @example
 * ```typescript
 * const $876 = create876Client({ apiKey: '876_app_secret_public' })
 * const result = await $876.auth.login({ identifier: 'alejandra@example.com', password: '...' })
 * if (result.error) return
 * console.log(result.data.object) // 'session' | 'auth_event'
 * ```
 */
export function create876Client(options: ClientOptions = {}) {
  const parsed = auth876ClientOptionsSchema.parse(options)
  const runtime = {
    baseUrl: resolveApiBaseUrl(parsed.baseUrl),
    apiKey: parsed.apiKey,
    fetch: parsed.fetch ?? globalThis.fetch.bind(globalThis),
    credentials: parsed.credentials,
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

  return {
    /** Authentication methods (login, register, social login, session, OTP, …). */
    auth: createAuthResource(runtime),
    /**
     * OAuth/OIDC methods for "Sign in with 876" relying-party flows. Requires
     * an `oauth` config block on {@link create876Client}; otherwise each method
     * returns an `oauth/client-not-configured` error.
     */
    oauth,
    /**
     * Developer apps owned by the current user/org (register/list/retrieve your
     * own OAuth clients). API-key tier; runs server-side with the app API key.
     */
    apps: createAppsResource(runtime),
    /**
     * Apps the user has connected via "Sign in with 876" (list/revoke). API-key
     * tier; runs server-side with the app API key.
     */
    oauthGrants: createOAuthGrantsResource(runtime),
    auditEvents: createAuditEventsResource(runtime),
    /**
     * Org-self-scoped organization structure (locations, departments, employee
     * profiles). Session tier — every method targets the caller's own org and
     * is authorized by org membership on the API.
     */
    orgs: createOrgsResource(runtime),
    users: createUsersResource(runtime),
    products: createProductsResource(runtime),
    billing: createBillingResource(runtime),
  }
}

/** The namespaced 876 platform client returned by {@link create876Client}. */
export type SDK876Client = ReturnType<typeof create876Client>

/** The auth namespace of the {@link SDK876Client}; used as the `client` in auth-ui. */
export type SDK876AuthClient = SDK876Client['auth']
