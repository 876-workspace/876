/**
 * The WorkOS HTTP client.
 *
 * Ported from `providers/workos/client.py`. Two request paths, and the
 * difference between them is the whole design:
 *
 * - **`post` / `get` / `del`** normalize a failure into an {@link AppHttpError}
 *   before it escapes.
 * - **`postAuth`** throws the raw {@link WorkOsHttpError} instead, because a 4xx
 *   from `/user_management/authenticate` often carries auth-flow data — a
 *   `pending_authentication_token` for an unverified email — and normalizing it
 *   would discard the token the flow depends on. The auth adapter reads the body
 *   and decides.
 *
 * Every request drops `undefined` and `null` values from its payload, matching
 * the Python's `{k: v for k, v in payload.items() if v is not None}`: WorkOS
 * rejects an explicit null where it expects an absent field.
 */

import { AppHttpError } from '@/platform/errors'
import { getLogger } from '@/platform/logger'

import { normalizeWorkOsError, WorkOsHttpError } from './errors'

const log = getLogger('workos')

/** WorkOS caps list endpoints at 100 items per page. */
const LIST_PAGE_SIZE = 100

const REQUEST_TIMEOUT_MS = 15_000

type Payload = Record<string, unknown>

function compact(payload: Payload): Payload {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value != null)
  )
}

export class WorkOsClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.baseUrl = (options.baseUrl ?? 'https://api.workos.com').replace(
      /\/+$/,
      ''
    )
    this.apiKey = options.apiKey
  }

  // --- transport ---

  /**
   * Send one request and return the parsed body.
   *
   * `normalize` is false only for the auth endpoints; see the module docstring.
   */
  private async send(
    method: string,
    path: string,
    options: {
      body?: Payload
      query?: Payload
      normalize?: boolean
      expectJson?: boolean
    } = {}
  ): Promise<Record<string, unknown>> {
    const normalize = options.normalize ?? true
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(key, String(value))
    }

    const startedAt = Date.now()
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(options.body
          ? { body: JSON.stringify(compact(options.body)) }
          : {}),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      // A transport failure is not a WorkOS error — there is no response to read
      // a code from — so it becomes a bad gateway rather than being normalized.
      log.error(
        {
          method,
          path,
          latency_ms: Date.now() - startedAt,
          error_type:
            error instanceof Error ? error.constructor.name : typeof error,
        },
        'workos.request_error'
      )
      throw new AppHttpError({
        code: 'auth/provider-unavailable',
        message: 'The authentication provider is temporarily unavailable.',
        httpStatus: 502,
        cause: error,
      })
    }

    if (!response.ok) {
      const body = await this.readBody(response)
      const latencyMs = Date.now() - startedAt

      // A 5xx is the provider failing; a 4xx is usually the request. Only the
      // former deserves an error-level line.
      const line = {
        method,
        path,
        status: response.status,
        latency_ms: latencyMs,
      }
      if (response.status >= 500) log.error(line, 'workos.request_failed')
      else log.warn(line, 'workos.request_failed')

      const httpError = new WorkOsHttpError(response.status, body)
      throw normalize ? normalizeWorkOsError(httpError) : httpError
    }

    if (options.expectJson === false) return {}

    return this.readBody(response)
  }

  /** Parse a body, tolerating an empty or non-JSON one. */
  private async readBody(response: Response): Promise<Record<string, unknown>> {
    try {
      const parsed: unknown = await response.json()
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      )
        return parsed as Record<string, unknown>
      return {}
    } catch {
      return {}
    }
  }

  private post(path: string, body: Payload): Promise<Record<string, unknown>> {
    return this.send('POST', path, { body })
  }

  /** Throws the raw {@link WorkOsHttpError}; see the module docstring. */
  private postAuth(
    path: string,
    body: Payload
  ): Promise<Record<string, unknown>> {
    return this.send('POST', path, { body, normalize: false })
  }

  private get(path: string, query?: Payload): Promise<Record<string, unknown>> {
    return this.send('GET', path, { ...(query ? { query } : {}) })
  }

  private async del(path: string): Promise<void> {
    await this.send('DELETE', path, { expectJson: false })
  }

  private list(body: Record<string, unknown>): Record<string, unknown>[] {
    const data = body['data']
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  }

  // --- authentication ---

  authenticateWithPassword(params: {
    email: string
    password: string
    clientId: string
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<Record<string, unknown>> {
    return this.postAuth('/user_management/authenticate', {
      grant_type: 'password',
      email: params.email,
      password: params.password,
      client_id: params.clientId,
      client_secret: this.apiKey,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    })
  }

  authenticateWithCode(params: {
    code: string
    clientId: string
    codeVerifier?: string | null
    invitationToken?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<Record<string, unknown>> {
    return this.postAuth('/user_management/authenticate', {
      grant_type: 'authorization_code',
      code: params.code,
      client_id: params.clientId,
      client_secret: this.apiKey,
      code_verifier: params.codeVerifier,
      invitation_token: params.invitationToken,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    })
  }

  authenticateWithRefreshToken(params: {
    refreshToken: string
    clientId: string
    organizationId?: string | null
  }): Promise<Record<string, unknown>> {
    return this.postAuth('/user_management/authenticate', {
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: this.apiKey,
      organization_id: params.organizationId,
    })
  }

  authenticateWithEmailVerification(params: {
    code: string
    pendingAuthenticationToken: string
    clientId: string
  }): Promise<Record<string, unknown>> {
    return this.postAuth('/user_management/authenticate', {
      grant_type: 'urn:workos:oauth:grant-type:email-verification:code',
      code: params.code,
      pending_authentication_token: params.pendingAuthenticationToken,
      client_id: params.clientId,
      client_secret: this.apiKey,
    })
  }

  authenticateWithMagicAuth(params: {
    code: string
    email: string
    clientId: string
    linkAuthorizationCode?: string | null
  }): Promise<Record<string, unknown>> {
    return this.postAuth('/user_management/authenticate', {
      grant_type: 'urn:workos:oauth:grant-type:magic-auth:code',
      code: params.code,
      email: params.email,
      client_id: params.clientId,
      client_secret: this.apiKey,
      link_authorization_code: params.linkAuthorizationCode,
    })
  }

  // --- users ---

  /**
   * Ask WorkOS to email a fresh email-verification code.
   *
   * Needed when an existing unverified account is adopted during a repeat
   * registration: the account already exists, so no code is issued
   * automatically, and without this the user is asked for a code that was never
   * sent — or expired days ago.
   */
  sendVerificationEmail(userId: string): Promise<Record<string, unknown>> {
    return this.post(
      `/user_management/users/${userId}/email_verification/send`,
      {}
    )
  }

  createUser(params: {
    email: string
    password?: string | null
    firstName?: string | null
    lastName?: string | null
    emailVerified?: boolean
    metadata?: Record<string, unknown> | null
  }): Promise<Record<string, unknown>> {
    return this.post('/user_management/users', {
      email: params.email,
      password: params.password,
      first_name: params.firstName,
      last_name: params.lastName,
      email_verified: params.emailVerified ?? false,
      metadata: params.metadata,
    })
  }

  async listUsers(email: string): Promise<Record<string, unknown>[]> {
    return this.list(await this.get('/user_management/users', { email }))
  }

  deleteUser(userId: string): Promise<void> {
    return this.del(`/user_management/users/${userId}`)
  }

  /** Every WorkOS user in the environment, following pagination cursors. */
  listAllUsers(): Promise<Record<string, unknown>[]> {
    return this.listAll('/user_management/users')
  }

  /** Every WorkOS organization in the environment, following pagination cursors. */
  listAllOrganizations(): Promise<Record<string, unknown>[]> {
    return this.listAll('/organizations')
  }

  listAllOrganizationMemberships(
    filters: { organizationId?: string | null; userId?: string | null } = {}
  ): Promise<Record<string, unknown>[]> {
    return this.listAll('/user_management/organization_memberships', {
      organization_id: filters.organizationId,
      user_id: filters.userId,
    })
  }

  /**
   * Drain a cursor-paginated WorkOS list endpoint into a single array.
   *
   * Terminates on an absent `after` cursor. A page that returns no cursor ends
   * the walk even if it was full, which is what WorkOS signals at the end.
   */
  private async listAll(
    path: string,
    query: Payload = {}
  ): Promise<Record<string, unknown>[]> {
    const items: Record<string, unknown>[] = []
    let after: string | null = null

    for (;;) {
      const body = await this.get(path, {
        ...query,
        limit: LIST_PAGE_SIZE,
        after,
      })
      items.push(...this.list(body))

      const metadata = body['list_metadata']
      const next =
        metadata !== null && typeof metadata === 'object'
          ? (metadata as Record<string, unknown>)['after']
          : null
      if (typeof next !== 'string' || !next) return items
      after = next
    }
  }

  // --- credential flows ---

  createMagicAuth(
    email: string,
    clientId: string
  ): Promise<Record<string, unknown>> {
    return this.post('/user_management/magic_auth', {
      email,
      client_id: clientId,
    })
  }

  createPasswordReset(
    email: string,
    clientId: string
  ): Promise<Record<string, unknown>> {
    return this.post('/user_management/password_reset', {
      email,
      client_id: clientId,
    })
  }

  resetPassword(
    token: string,
    newPassword: string
  ): Promise<Record<string, unknown>> {
    return this.post('/user_management/password_reset/confirm', {
      token,
      new_password: newPassword,
    })
  }

  // --- organizations ---

  createOrganization(params: {
    name: string
    domainData?: Record<string, unknown>[] | null
    externalId?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<Record<string, unknown>> {
    return this.post('/organizations', {
      name: params.name,
      domain_data: params.domainData,
      external_id: params.externalId,
      metadata: params.metadata,
    })
  }

  deleteOrganization(organizationId: string): Promise<void> {
    return this.del(`/organizations/${organizationId}`)
  }

  createOrganizationMembership(params: {
    userId: string
    organizationId: string
    roleSlug?: string | null
  }): Promise<Record<string, unknown>> {
    return this.post('/user_management/organization_memberships', {
      user_id: params.userId,
      organization_id: params.organizationId,
      role_slug: params.roleSlug,
    })
  }

  deleteOrganizationMembership(membershipId: string): Promise<void> {
    return this.del(`/user_management/organization_memberships/${membershipId}`)
  }

  // --- sessions ---

  async revokeSession(sessionId: string): Promise<void> {
    await this.send('POST', `/user_management/sessions/${sessionId}/revoke`, {
      expectJson: false,
    })
    log.info({ session_id: sessionId }, 'workos.session_revoked')
  }

  // --- feature flags ---

  async listFeatureFlags(limit = 100): Promise<Record<string, unknown>[]> {
    return this.list(await this.get('/feature-flags', { limit }))
  }

  getFeatureFlag(slug: string): Promise<Record<string, unknown>> {
    return this.get(`/feature-flags/${slug}`)
  }

  async addFeatureFlagTarget(
    slug: string,
    targetId: string
  ): Promise<Record<string, unknown>> {
    const result = await this.send(
      'POST',
      `/feature-flags/${slug}/targets/${targetId}`,
      {}
    )
    log.info({ slug, target_id: targetId }, 'workos.feature_target_added')

    return result
  }

  async removeFeatureFlagTarget(slug: string, targetId: string): Promise<void> {
    await this.del(`/feature-flags/${slug}/targets/${targetId}`)
    log.info({ slug, target_id: targetId }, 'workos.feature_target_removed')
  }

  // --- SSO ---

  getJwks(clientId: string): Promise<Record<string, unknown>> {
    return this.get(`/sso/jwks/${clientId}`)
  }

  /**
   * The hosted-authorization URL to redirect a browser to.
   *
   * Synchronous and side-effect free — it only builds a URL.
   */
  getAuthorizationUrl(params: {
    clientId: string
    redirectUri: string
    provider?: string | null
    screenHint?: string | null
    loginHint?: string | null
    state?: string | null
  }): string {
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
    })
    if (params.provider != null) query.set('provider', params.provider)
    if (params.screenHint != null) query.set('screen_hint', params.screenHint)
    if (params.loginHint != null) query.set('login_hint', params.loginHint)
    if (params.state != null) query.set('state', params.state)

    return `${this.baseUrl}/sso/authorize?${query.toString()}`
  }
}

let cachedClient: WorkOsClient | null = null

/**
 * The process-wide WorkOS client.
 *
 * Cached because the client is stateless configuration — an API key and a base
 * URL — and rebuilding it per request would buy nothing.
 */
export function getWorkOsClient(settings: {
  workos: { apiKey: string }
}): WorkOsClient {
  cachedClient ??= new WorkOsClient({ apiKey: settings.workos.apiKey })

  return cachedClient
}

/** Drop the cached client. Tests reconfigure the API key between suites. */
export function resetWorkOsClientCache(): void {
  cachedClient = null
}
