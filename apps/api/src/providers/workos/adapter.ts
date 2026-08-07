/**
 * The WorkOS implementation of the provider-neutral auth contract.
 *
 * Ported from `providers/workos/adapter.py`. This is the layer that turns a raw
 * WorkOS response into one of the three outcomes in `providers/auth.ts`:
 *
 * - a parsed {@link AuthSession} on success;
 * - an {@link AuthEvent} when WorkOS reports a **flow step** — verify an email,
 *   answer MFA, choose an organization — which is not a failure;
 * - a thrown `AppHttpError` for a hard error.
 *
 * `AUTH_FLOW_CODES` is what separates the second case from the third, and it is
 * the reason the client's `postAuth` re-throws the raw error: the flow codes
 * arrive as 4xx responses whose bodies carry the token the next step needs.
 */

import { getLogger } from '@/platform/logger'
import type { AuthEvent, AuthSession, ProviderUser } from '@/providers/auth'

import { getWorkOsClient, WorkOsClient } from './client'
import {
  isWorkOsHttpError,
  normalizeWorkOsError,
  WorkOsHttpError,
} from './errors'

const log = getLogger('workos')

/**
 * WorkOS codes that mean "another step is required", not "this failed".
 *
 * Anything outside this set is a hard error. Adding a code here changes a 4xx
 * from an error into a flow step, so it is a deliberate decision, not a
 * catch-all.
 */
const AUTH_FLOW_CODES: ReadonlySet<string> = new Set([
  'email_verification_required',
  'mfa_enrollment',
  'mfa_challenge',
  'organization_selection_required',
  'sso_required',
  'organization_authentication_methods_required',
  'authentication_method_not_allowed',
  'email_password_auth_disabled',
  'passkey_progressive_enrollment',
  'radar_challenge',
  'radar_sign_up_challenge',
])

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function objectList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/**
 * Read a WorkOS user payload, accepting either casing.
 *
 * WorkOS returns snake_case on most endpoints and camelCase on some; the Python
 * model declared both as validation aliases, so both are accepted here.
 */
export function toProviderUser(raw: Record<string, unknown>): ProviderUser {
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = str(raw[key])
      if (value) return value
    }
    return null
  }

  const metadata = raw['metadata']

  return {
    id: str(raw['id']) ?? '',
    email: str(raw['email']) ?? '',
    firstName: pick('first_name', 'firstName'),
    lastName: pick('last_name', 'lastName'),
    emailVerified: Boolean(
      raw['email_verified'] ?? raw['emailVerified'] ?? false
    ),
    avatar: pick('profile_picture_url', 'profilePictureUrl'),
    metadata:
      metadata !== null &&
      typeof metadata === 'object' &&
      !Array.isArray(metadata)
        ? (metadata as Record<string, string>)
        : {},
  }
}

function parseSuccess(raw: Record<string, unknown>): AuthSession {
  const user = raw['user']

  return {
    accessToken: str(raw['access_token']) ?? str(raw['accessToken']) ?? '',
    refreshToken: str(raw['refresh_token']) ?? str(raw['refreshToken']),
    user: toProviderUser(
      user !== null && typeof user === 'object'
        ? (user as Record<string, unknown>)
        : {}
    ),
    organizationId:
      str(raw['organization_id']) ?? str(raw['organizationId']) ?? null,
  }
}

/** An {@link AuthEvent} for a flow code, or null when this is a hard error. */
function extractEvent(error: WorkOsHttpError): AuthEvent | null {
  if (!AUTH_FLOW_CODES.has(error.code)) return null

  return {
    kind: error.code,
    email: str(error.body['email']),
    pendingToken: str(error.body['pending_authentication_token']),
    organizations: objectList(error.body['organizations']),
    authFactors: objectList(error.body['authentication_factors']),
    connectionIds: stringList(error.body['connection_ids']),
  }
}

export class WorkOsAuthProvider {
  private readonly client: WorkOsClient

  constructor(client: WorkOsClient) {
    this.client = client
  }

  /** Return an {@link AuthEvent}, or throw. Never returns null. */
  private handleAuthError(error: unknown): AuthEvent {
    if (!isWorkOsHttpError(error)) throw error

    const event = extractEvent(error)
    if (event) return event

    log.warn({ status: error.status }, 'workos.auth.hard_error')
    throw normalizeWorkOsError(error)
  }

  /** Normalize a raw WorkOS failure; anything else passes through unchanged. */
  private rethrow(error: unknown): never {
    if (isWorkOsHttpError(error)) throw normalizeWorkOsError(error)
    throw error
  }

  // --- authentication ---

  async login(params: {
    email: string
    password: string
    clientId: string
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<AuthSession | AuthEvent> {
    try {
      return parseSuccess(await this.client.authenticateWithPassword(params))
    } catch (error) {
      return this.handleAuthError(error)
    }
  }

  async register(params: {
    email: string
    password?: string | null
    firstName?: string | null
    lastName?: string | null
    emailVerified?: boolean
    metadata?: Record<string, unknown> | null
  }): Promise<ProviderUser> {
    try {
      return toProviderUser(await this.client.createUser(params))
    } catch (error) {
      this.rethrow(error)
    }
  }

  async getUserByEmail(email: string): Promise<ProviderUser | null> {
    try {
      const users = await this.client.listUsers(email)
      const first = users[0]

      return first ? toProviderUser(first) : null
    } catch (error) {
      this.rethrow(error)
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.client.deleteUser(userId)
    } catch (error) {
      this.rethrow(error)
    }
  }

  async sendOtp(
    email: string,
    clientId: string
  ): Promise<Record<string, unknown>> {
    try {
      return await this.client.createMagicAuth(email, clientId)
    } catch (error) {
      this.rethrow(error)
    }
  }

  async verifyOtp(params: {
    code: string
    email: string
    clientId: string
  }): Promise<AuthSession | AuthEvent> {
    try {
      return parseSuccess(await this.client.authenticateWithMagicAuth(params))
    } catch (error) {
      return this.handleAuthError(error)
    }
  }

  async sendRecovery(email: string, clientId: string): Promise<void> {
    try {
      await this.client.createPasswordReset(email, clientId)
    } catch (error) {
      this.rethrow(error)
    }
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ProviderUser> {
    try {
      const raw = await this.client.resetPassword(token, newPassword)
      const user = raw['user']

      return toProviderUser(
        user !== null && typeof user === 'object'
          ? (user as Record<string, unknown>)
          : {}
      )
    } catch (error) {
      this.rethrow(error)
    }
  }

  /**
   * Resend the email-verification code.
   *
   * The Python wrapped this in `except httpx.HTTPStatusError: self.
   * _handle_http_error(exc)`, but the client's `_post` had already converted the
   * failure into an `AppHTTPException` — so that clause could never fire and the
   * normalized error always propagated. The dead branch is not reproduced here;
   * this endpoint goes through the normalizing path and throws, which is what
   * the Python actually did.
   */
  sendVerificationEmail(userId: string): Promise<Record<string, unknown>> {
    return this.client.sendVerificationEmail(userId)
  }

  async verifyEmail(params: {
    code: string
    pendingAuthenticationToken: string
    clientId: string
  }): Promise<AuthSession | AuthEvent> {
    try {
      return parseSuccess(
        await this.client.authenticateWithEmailVerification(params)
      )
    } catch (error) {
      return this.handleAuthError(error)
    }
  }

  async authenticateWithCode(params: {
    code: string
    clientId: string
    codeVerifier?: string | null
    invitationToken?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<AuthSession | AuthEvent> {
    try {
      return parseSuccess(await this.client.authenticateWithCode(params))
    } catch (error) {
      return this.handleAuthError(error)
    }
  }

  async refresh(params: {
    refreshToken: string
    clientId: string
    organizationId?: string | null
  }): Promise<AuthSession | AuthEvent> {
    try {
      return parseSuccess(
        await this.client.authenticateWithRefreshToken(params)
      )
    } catch (error) {
      return this.handleAuthError(error)
    }
  }

  /** Already normalized by the client, so no extra handling here. */
  revokeSession(sessionId: string): Promise<void> {
    return this.client.revokeSession(sessionId)
  }

  // --- organizations ---

  async createOrganization(params: {
    name: string
    externalId?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<Record<string, unknown>> {
    try {
      return await this.client.createOrganization(params)
    } catch (error) {
      this.rethrow(error)
    }
  }

  async createOrganizationMembership(params: {
    userId: string
    organizationId: string
    roleSlug?: string | null
  }): Promise<Record<string, unknown>> {
    try {
      return await this.client.createOrganizationMembership(params)
    } catch (error) {
      this.rethrow(error)
    }
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    try {
      await this.client.deleteOrganization(organizationId)
    } catch (error) {
      this.rethrow(error)
    }
  }

  async deleteOrganizationMembership(membershipId: string): Promise<void> {
    try {
      await this.client.deleteOrganizationMembership(membershipId)
    } catch (error) {
      this.rethrow(error)
    }
  }

  // --- directory listing, for reconciliation ---

  async listUsers(): Promise<Record<string, unknown>[]> {
    try {
      return await this.client.listAllUsers()
    } catch (error) {
      this.rethrow(error)
    }
  }

  async listOrganizations(): Promise<Record<string, unknown>[]> {
    try {
      return await this.client.listAllOrganizations()
    } catch (error) {
      this.rethrow(error)
    }
  }

  async listOrganizationMemberships(
    filters: { organizationId?: string | null; userId?: string | null } = {}
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.client.listAllOrganizationMemberships(filters)
    } catch (error) {
      this.rethrow(error)
    }
  }

  // --- feature flags ---

  async addFeatureTarget(slug: string, targetId: string): Promise<void> {
    try {
      await this.client.addFeatureFlagTarget(slug, targetId)
    } catch (error) {
      this.rethrow(error)
    }
  }

  async removeFeatureTarget(slug: string, targetId: string): Promise<void> {
    try {
      await this.client.removeFeatureFlagTarget(slug, targetId)
    } catch (error) {
      this.rethrow(error)
    }
  }

  // --- OAuth / JWKS ---

  getAuthorizationUrl(params: {
    clientId: string
    redirectUri: string
    provider?: string | null
    screenHint?: string | null
    loginHint?: string | null
    state?: string | null
  }): string {
    return this.client.getAuthorizationUrl(params)
  }

  getJwks(clientId: string): Promise<Record<string, unknown>> {
    return this.client.getJwks(clientId)
  }
}

let cachedProvider: WorkOsAuthProvider | null = null

export function getAuthProvider(settings: {
  workos: { apiKey: string }
}): WorkOsAuthProvider {
  cachedProvider ??= new WorkOsAuthProvider(getWorkOsClient(settings))

  return cachedProvider
}

/** Drop the cached provider. Tests reconfigure the API key between suites. */
export function resetAuthProviderCache(): void {
  cachedProvider = null
}
