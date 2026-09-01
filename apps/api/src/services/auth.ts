import { getSettings, isPlatformOwnerEmail } from '@/config'
import { AppHttpError } from '@/http/errors'
import { isDisposableEmailDomain } from '@/platform/email'
import { generateId, generatePlatformOwnerUserId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { OWNER_ROLE_NAME } from '@/platform/permissions'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getAuthProvider } from '@/providers/workos/adapter'
import { isWorkOsNotFound } from '@/providers/workos/errors'
import {
  isAuthEvent,
  type AuthEvent,
  type AuthSession,
  type ProviderUser,
} from '@/providers/auth'

import * as repository from './auth.repository'
import type { AuthUserRow } from './auth.repository'
import {
  createOrganizationBootstrapDeps,
  resolveRegistrationSlug,
} from './organization-bootstrap'
import {
  assignMemberApps,
  ensureDefaultContact,
  provisionOrganization,
} from './provisioning'
import { workspace } from './workspace'

/**
 * The authentication service — login, registration, OTP, recovery, and the
 * business sign-up that bootstraps an organization.
 *
 * Ported from `services/auth.py`. It owns input validation, identifier
 * resolution, local user reads and writes, feature grants, and provider
 * coordination. It owns **no** HTTP concerns: cookies, headers, status codes
 * and serialization stay in the module's controller.
 *
 * Every collaborator is injected, the same narrow-surface shape
 * `identity-sync` and `organization-bootstrap` already use, so the whole
 * service is drivable in tests without a database or a live WorkOS client.
 */

const log = getLogger('auth')

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

/** Authenticated — a session was issued. */
export type ServiceAuthOk = { status: 'ok'; session: AuthSession }

/**
 * A further step is required before a session can be issued (verify an email,
 * answer an MFA challenge, pick an organization). **Not an error** — reporting
 * it as one tells a user who must verify their email that their password was
 * wrong.
 */
export type ServiceAuthPending = { status: 'pending'; event: AuthEvent }

export type ServiceAuthResult = ServiceAuthOk | ServiceAuthPending

function ok(session: AuthSession): ServiceAuthOk {
  return { status: 'ok', session }
}

function pending(event: AuthEvent): ServiceAuthPending {
  return { status: 'pending', event }
}

/**
 * AuthEvent kinds WorkOS only returns **after** the submitted password was
 * verified. Kinds outside this set (`sso_required`,
 * `email_password_auth_disabled`, radar challenges, …) can fire before
 * credential validation, so they must never be treated as proof of account
 * ownership when adopting an existing user.
 */
const CREDENTIAL_PROVEN_EVENT_KINDS: ReadonlySet<string> = new Set([
  'email_verification_required',
  'mfa_enrollment',
  'mfa_challenge',
  'organization_selection_required',
])

// ---------------------------------------------------------------------------
// Injected dependencies
// ---------------------------------------------------------------------------

export type AuthProviderPort = {
  login(params: {
    email: string
    password: string
    clientId: string
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<AuthSession | AuthEvent>
  register(params: {
    email: string
    password: string
    firstName: string
    lastName: string
    emailVerified: boolean
    metadata?: Record<string, string>
  }): Promise<ProviderUser>
  getUserByEmail(email: string): Promise<ProviderUser | null>
  sendVerificationEmail?(userId: string): Promise<unknown>
  sendOtp(email: string, clientId: string): Promise<Record<string, unknown>>
  verifyOtp(params: {
    code: string
    email: string
    clientId: string
  }): Promise<AuthSession | AuthEvent>
  sendRecovery(email: string, clientId: string): Promise<void>
  resetPassword(token: string, newPassword: string): Promise<ProviderUser>
  verifyEmail(params: {
    code: string
    pendingAuthenticationToken: string
    clientId: string
  }): Promise<AuthSession | AuthEvent>
  authenticateWithCode(params: {
    code: string
    clientId: string
    codeVerifier?: string | null
    invitationToken?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<AuthSession | AuthEvent>
  refresh(params: {
    refreshToken: string
    clientId: string
    organizationId?: string | null
  }): Promise<AuthSession | AuthEvent>
  createOrganization(params: {
    name: string
    externalId: string
    metadata: Record<string, string>
  }): Promise<{ id: string; metadata?: unknown }>
  createOrganizationMembership(params: {
    userId: string
    organizationId: string
    roleSlug: string
  }): Promise<{ id: string }>
  deleteOrganization(organizationId: string): Promise<void>
  getAuthorizationUrl(params: {
    clientId: string
    redirectUri: string
    provider: string
    screenHint?: string | null
    loginHint?: string | null
  }): string
}

export type AuthMembershipRow = {
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  roleId: string | null
  status: string
}

export type AuthOrganizationRow = {
  id: string
  workosOrganizationId: string | null
  name: string | null
  slug: string
  status: string
}

export type AuthRepositoryPort = {
  findUserByUsername(username: string): Promise<AuthUserRow | null>
  findUserByWorkosId(workosUserId: string): Promise<AuthUserRow | null>
  findUserByEmail(email: string): Promise<AuthUserRow | null>
  createUser(data: {
    id: string
    workosUserId: string
    email: string
    emailVerified: boolean
    firstName: string
    lastName: string
    avatar: string | null
    platformRole: string | null
    status: string
    createdAt: bigint
    updatedAt: bigint
  }): Promise<AuthUserRow>
  updateUser(
    userId: string,
    data: {
      workosUserId?: string
      email?: string
      emailVerified?: boolean
      firstName?: string
      lastName?: string
      avatar?: string | null
      status?: string
      updatedAt: bigint
    }
  ): Promise<AuthUserRow>
  listConsumerDefaultFeatures(): Promise<{ id: string }[]>
  upsertUserFeature(data: {
    id: string
    userId: string
    featureId: string
    status: string
    syncedAt: bigint
    createdAt: bigint
    updatedAt: bigint
  }): Promise<void>
  hasAnyMembership(userId: string): Promise<boolean>
  findFirstMembership(userId: string): Promise<AuthMembershipRow | null>
  findMembership(
    organizationId: string,
    userId: string
  ): Promise<AuthMembershipRow | null>
  createMembership(data: {
    id: string
    organizationId: string
    userId: string
    workosMembershipId: string | null
    role: string
    roleId: string | null
    status: string
    createdAt: bigint
    updatedAt: bigint
  }): Promise<void>
  updateMembership(
    id: string,
    data: {
      status?: string
      roleId?: string | null
      updatedAt: bigint
    }
  ): Promise<void>
  findOrganizationById(id: string): Promise<AuthOrganizationRow | null>
  createOrganization(data: {
    id: string
    workosOrganizationId: string | null
    name: string
    slug: string
    status: string
    countryCode: string
    currencyCode: string
    language: string
    metadata: unknown
    createdAt: bigint
    updatedAt: bigint
  }): Promise<{ id: string; slug: string }>
  findEmailOtpChallenge(
    email: string
  ): Promise<{ canResendAt: bigint | null } | null>
  upsertEmailOtpChallenge(data: {
    email: string
    pendingAuthToken: string
    emailVerificationId: string
    canResendAt: bigint
    expiresAt: bigint
    createdAt: bigint
    updatedAt: bigint
  }): Promise<void>
}

export type AuthDeps = {
  provider: AuthProviderPort
  repository: AuthRepositoryPort
  /** `services/organization-bootstrap.ts` — slug resolution for a new org. */
  resolveRegistrationSlug(
    name: string,
    slug: string | null | undefined
  ): Promise<string>
  /** `services/provisioning.ts` — roles, setup subscriptions, and finance. */
  provisionOrganization(
    organizationId: string,
    now: number,
    options: {
      sourceAppId?: string | null
      requireProvisioningSelection?: boolean
    }
  ): Promise<Record<string, { id: string }>>
  /** `services/provisioning.ts` — the owner's effective app assignments. */
  assignMemberApps(params: {
    organizationId: string
    userId: string
    now: number
    sourceAppId?: string | null
  }): Promise<void>
  /** Apply the selected setup's Work service/capability policy. */
  ensureWork(organizationId: string): Promise<void>
  /** `services/provisioning.ts` — seeds the org's primary contact. */
  ensureDefaultContact(
    organizationId: string,
    user: {
      id: string
      firstName: string
      lastName: string | null
      email: string | null
      phone: string | null
    },
    now: number
  ): Promise<void>
  /** POSTs a magic-auth code to the configured delivery endpoint. */
  deliverOtp(params: {
    url: string
    email: string
    code: string
  }): Promise<boolean>
  settings?: { workosClientId: string; otpDeliveryUrl: string }
}

export function isFinanceWorkspaceUnavailable(error: unknown): boolean {
  return (
    error instanceof AppHttpError &&
    error.code === 'provisioning/finance-workspace-unavailable'
  )
}

// ---------------------------------------------------------------------------
// Validation helpers — pure, mirroring the Python character for character
// ---------------------------------------------------------------------------

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/

function checkRequired(
  value: string | null | undefined,
  code: string,
  message: string,
  httpStatus = 400
): string {
  if (!value || !value.trim())
    throw new AppHttpError({ code, message, httpStatus })
  return value.trim()
}

export function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes('@')) {
    throw new AppHttpError({
      code: 'auth/invalid-email',
      message: 'Please enter a valid email address.',
      httpStatus: 400,
    })
  }
  if (isDisposableEmailDomain(normalized)) {
    throw new AppHttpError({
      code: 'auth/domain-blacklisted',
      message: 'This email domain cannot be used to sign in or register.',
      httpStatus: 403,
    })
  }
  return normalized
}

function validatePassword(password: string | null | undefined): string {
  const value = checkRequired(
    password,
    'auth/missing-password',
    'Please enter your password.'
  )
  if (value.length < 8) {
    throw new AppHttpError({
      code: 'auth/invalid-password',
      message: 'Password must be at least 8 characters long.',
      httpStatus: 400,
    })
  }
  return value
}

/**
 * The wording of a failed sign-in, keyed to what the caller typed.
 *
 * Deliberately never says whether the account exists — the three variants
 * differ only in naming the field, not in disclosing a match.
 */
export function invalidCredentialsMessage(identifier?: string | null): string {
  const normalized = identifier ? identifier.trim() : ''
  if (!normalized) return 'The sign-in information you entered is incorrect.'
  if (normalized.includes('@'))
    return 'The email or password you entered is incorrect.'
  return 'The username or password you entered is incorrect.'
}

// ---------------------------------------------------------------------------
// URL helpers — ported from the module-level functions in services/auth.py
// ---------------------------------------------------------------------------

function parse(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export function normalizeOrigin(
  value: string | null | undefined
): string | null {
  const normalized = value ? value.trim() : ''
  if (!normalized) return null

  const parsed = parse(normalized)
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:'))
    return null
  if (!parsed.host) return null

  return `${parsed.protocol}//${parsed.host}`
}

export function callbackUriFromOrigin(
  origin: string | null | undefined
): string | null {
  const normalized = normalizeOrigin(origin)
  return normalized === null ? null : `${normalized}/callback`
}

export function normalizeUrl(value: string | null | undefined): string | null {
  const normalized = value ? value.trim().replace(/\/+$/, '') : ''
  if (!normalized) return null

  const parsed = parse(normalized)
  if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:'))
    return null
  if (!parsed.host) return null

  return normalized
}

export function isLocalOrigin(value: string): boolean {
  const parsed = parse(value)
  return parsed?.hostname === 'localhost' || parsed?.hostname === '127.0.0.1'
}

/**
 * The WorkOS callback URL for this request.
 *
 * Every 876 app hosts its own embedded auth, so the callback has to land back
 * on the app the user started from — a single configured URL sends every app's
 * social sign-in to whichever app that URL names, and the others bounce back to
 * their login screen with no session. The request-derived origin therefore wins
 * whenever it is one of the platform's own origins.
 *
 * `allowedOrigins` is the gate, and it is not optional: the origin is derived
 * from the caller's `Host`/`x-876-origin` header, so accepting it unchecked
 * would let a forged header redirect an authorization code offsite. An origin
 * that is not allow-listed falls back to the configured URL exactly as before.
 *
 * A configured value that is missing or local-only still yields to the request
 * origin, which is what lets a Codespace or a preview deployment complete a
 * social callback without a hardcoded host (`.claude/rules/api-access.md`).
 */
export function resolveWorkosRedirectUri(
  configuredValue: string | null | undefined,
  requestOrigin: string | null | undefined,
  allowedOrigins: readonly string[] = []
): string | null {
  const configured = normalizeUrl(configuredValue)
  const requestCallback = callbackUriFromOrigin(requestOrigin)
  if (!requestCallback) return configured

  if (!configured || isLocalOrigin(configured)) return requestCallback

  return isAllowedOrigin(requestOrigin, allowedOrigins)
    ? requestCallback
    : configured
}

/** Whether `origin` matches one of the platform's configured public origins. */
function isAllowedOrigin(
  origin: string | null | undefined,
  allowedOrigins: readonly string[]
): boolean {
  const normalized = normalizeOrigin(origin)
  if (!normalized) return false

  return allowedOrigins.some(
    (allowed) => normalizeOrigin(allowed) === normalized
  )
}

// ---------------------------------------------------------------------------
// The service
// ---------------------------------------------------------------------------

export class AuthService {
  constructor(private readonly deps: AuthDeps) {}

  private get clientId(): string {
    return this.deps.settings?.workosClientId ?? getSettings().workos.clientId
  }

  private get otpDeliveryUrl(): string {
    return (
      this.deps.settings?.otpDeliveryUrl ??
      getSettings().emailAuthOtpDeliveryUrl
    )
  }

  /** Resolve a username-or-email identifier to a canonical email address. */
  private async resolveIdentifier(identifier: string): Promise<string> {
    const trimmed = identifier.trim()
    if (trimmed.includes('@')) return validateEmail(trimmed)

    const username = trimmed.toLowerCase()
    if (
      username.length < 3 ||
      username.length > 32 ||
      !USERNAME_PATTERN.test(username)
    ) {
      throw new AppHttpError({
        code: 'auth/invalid-identifier',
        message: 'Please enter a valid username or email.',
        httpStatus: 400,
      })
    }

    const user = await this.deps.repository.findUserByUsername(username)
    if (!user) {
      throw new AppHttpError({
        code: 'auth/invalid-credentials',
        message: invalidCredentialsMessage(identifier),
        httpStatus: 401,
      })
    }

    return validateEmail(user.email)
  }

  private async grantDefaultConsumerFeatures(
    localUserId: string,
    now: number
  ): Promise<void> {
    const defaults = await this.deps.repository.listConsumerDefaultFeatures()
    const nowBigint = BigInt(now)
    for (const feature of defaults) {
      await this.deps.repository.upsertUserFeature({
        id: generateId('userFeature'),
        userId: localUserId,
        featureId: feature.id,
        status: 'enabled',
        syncedAt: nowBigint,
        createdAt: nowBigint,
        updatedAt: nowBigint,
      })
    }
  }

  /**
   * Register a new WorkOS user, or adopt an existing one **after the submitted
   * password has been proven against it**.
   *
   * The proof is the whole point: adopting on an email collision alone would
   * hand an existing account to whoever knows the address. Only a session, or
   * an event kind WorkOS emits post-verification, counts.
   */
  private async registerOrAdoptWorkosUser(params: {
    email: string
    password: string
    firstName: string
    lastName: string
    metadata?: Record<string, string>
  }): Promise<{ user: ProviderUser; createdNow: boolean }> {
    let registrationError: AppHttpError
    try {
      const user = await this.deps.provider.register({
        email: params.email,
        password: params.password,
        firstName: params.firstName,
        lastName: params.lastName,
        emailVerified: false,
        metadata: params.metadata,
      })
      return { user, createdNow: true }
    } catch (error) {
      if (
        !(error instanceof AppHttpError) ||
        (error.code !== 'auth/email-already-exists' &&
          error.code !== 'auth/registration-failed')
      )
        throw error
      registrationError = error
    }

    const alreadyExists = new AppHttpError({
      code: 'auth/email-already-exists',
      message:
        'An account with this email already exists. Sign in to continue.',
      httpStatus: 409,
    })

    let loginResult: AuthSession | AuthEvent
    try {
      loginResult = await this.deps.provider.login({
        email: params.email,
        password: params.password,
        clientId: this.clientId,
      })
    } catch {
      throw alreadyExists
    }

    if (!isAuthEvent(loginResult))
      return { user: loginResult.user, createdNow: false }

    if (!CREDENTIAL_PROVEN_EVENT_KINDS.has(loginResult.kind))
      throw alreadyExists

    const adopted = await this.deps.provider.getUserByEmail(params.email)
    if (adopted === null) throw registrationError

    if (loginResult.kind === 'email_verification_required') {
      await this.sendVerificationEmail(adopted)
    }

    return { user: adopted, createdNow: false }
  }

  /** Resend the verification code, best-effort. */
  private async sendVerificationEmail(user: ProviderUser): Promise<void> {
    const send = this.deps.provider.sendVerificationEmail
    if (!send) return
    try {
      await send.call(this.deps.provider, user.id)
    } catch (error) {
      log.warn({ err: error }, 'auth.verification_email.resend_failed')
    }
  }

  /** Create the local user row for a provider user, if it does not exist. */
  private async ensureLocalUser(params: {
    workosUser: ProviderUser
    fallbackFirstName: string
    fallbackLastName: string
    now: number
  }): Promise<{ user: AuthUserRow; created: boolean }> {
    const email = params.workosUser.email.toLowerCase().trim()
    const existing = await this.deps.repository.findUserByWorkosId(
      params.workosUser.id
    )
    if (existing) return { user: existing, created: false }

    const isOwner = isPlatformOwnerEmail(email)
    const nowBigint = BigInt(params.now)
    const user = await this.deps.repository.createUser({
      id: isOwner ? generatePlatformOwnerUserId() : generateId('user'),
      workosUserId: params.workosUser.id,
      email,
      emailVerified: params.workosUser.emailVerified,
      firstName: params.workosUser.firstName || params.fallbackFirstName,
      lastName: params.workosUser.lastName || params.fallbackLastName,
      avatar: params.workosUser.avatar,
      platformRole: isOwner ? 'owner' : null,
      status: 'inactive',
      createdAt: nowBigint,
      updatedAt: nowBigint,
    })
    return { user, created: true }
  }

  // ── Public auth operations ───────────────────────────────────────────────

  async login(params: {
    identifier: string
    password: string
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<ServiceAuthResult> {
    const identifier = checkRequired(
      params.identifier,
      'auth/missing-identifier',
      'Please enter your username or email.'
    )
    checkRequired(
      params.password,
      'auth/missing-password',
      'Please enter your password.'
    )

    const email = await this.resolveIdentifier(identifier)

    let result: AuthSession | AuthEvent
    try {
      result = await this.deps.provider.login({
        email,
        password: params.password,
        clientId: this.clientId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      })
    } catch (error) {
      if (
        error instanceof AppHttpError &&
        error.code === 'auth/invalid-credentials'
      ) {
        throw new AppHttpError({
          code: error.code,
          message: invalidCredentialsMessage(identifier),
          httpStatus: error.httpStatus,
        })
      }
      throw error
    }

    return isAuthEvent(result) ? pending(result) : ok(result)
  }

  async register(params: {
    email: string
    password: string
    firstName: string
    lastName: string
  }): Promise<ServiceAuthResult> {
    checkRequired(
      params.email,
      'auth/missing-email',
      'Please enter your email address.'
    )
    const firstName = checkRequired(
      params.firstName,
      'auth/missing-first-name',
      'Please enter your first name.'
    )
    const lastName = checkRequired(
      params.lastName,
      'auth/missing-last-name',
      'Please enter your last name.'
    )
    const password = validatePassword(params.password)
    const email = validateEmail(params.email)

    const { user: workosUser } = await this.registerOrAdoptWorkosUser({
      email,
      password,
      firstName,
      lastName,
    })

    const now = nowUnixSeconds()
    const { user: localUser, created } = await this.ensureLocalUser({
      workosUser,
      fallbackFirstName: firstName,
      fallbackLastName: lastName,
      now,
    })
    if (created) await this.grantDefaultConsumerFeatures(localUser.id, now)

    const loginResult = await this.deps.provider.login({
      email,
      password,
      clientId: this.clientId,
    })
    if (isAuthEvent(loginResult)) return pending(loginResult)

    await this.deps.repository.updateUser(localUser.id, {
      emailVerified: loginResult.user.emailVerified,
      status: 'active',
      updatedAt: BigInt(now),
    })
    log.info(
      {
        user_id: localUser.id,
        workos_user_id: workosUser.id,
        email_verified: loginResult.user.emailVerified,
      },
      'auth.register.succeeded'
    )
    return ok(loginResult)
  }

  async registerBusiness(params: {
    email: string
    password: string
    firstName: string
    lastName: string
    organizationName: string
    countryCode: string
    organizationSlug?: string | null
    currencyCode?: string | null
    language?: string | null
    sourceAppId?: string | null
  }): Promise<ServiceAuthResult> {
    checkRequired(
      params.email,
      'auth/missing-email',
      'Please enter your email address.'
    )
    const firstName = checkRequired(
      params.firstName,
      'auth/missing-first-name',
      'Please enter your first name.'
    )
    const lastName = checkRequired(
      params.lastName,
      'auth/missing-last-name',
      'Please enter your last name.'
    )
    const organizationName = checkRequired(
      params.organizationName,
      'auth/missing-organization-name',
      'Please enter your organization name.'
    )
    const countryCode = checkRequired(
      params.countryCode,
      'auth/invalid-input',
      'Please select your organization country.'
    ).toUpperCase()
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      throw new AppHttpError({
        code: 'auth/invalid-input',
        message: 'Please select a valid organization country.',
        httpStatus: 400,
      })
    }
    const password = validatePassword(params.password)
    const email = validateEmail(params.email)

    const { user: workosUser } = await this.registerOrAdoptWorkosUser({
      email,
      password,
      firstName,
      lastName,
      metadata: {},
    })

    const now = nowUnixSeconds()
    const nowBigint = BigInt(now)
    const { user: localUser } = await this.ensureLocalUser({
      workosUser,
      fallbackFirstName: firstName,
      fallbackLastName: lastName,
      now,
    })

    // A retry must reuse the setup persisted by the first attempt. The country
    // submitted on a retry is never allowed to re-route an existing org.
    const existingMembership = await this.deps.repository.findFirstMembership(
      localUser.id
    )

    if (existingMembership) {
      const organizationId = existingMembership.organizationId

      await this.deps.provisionOrganization(organizationId, now, {
        sourceAppId: params.sourceAppId ?? null,
        requireProvisioningSelection: true,
      })
      await this.deps.ensureWork(organizationId)

      await this.deps.assignMemberApps({
        organizationId,
        userId: localUser.id,
        now,
        sourceAppId: params.sourceAppId ?? null,
      })

      await this.deps.ensureDefaultContact(
        organizationId,
        {
          id: localUser.id,
          firstName: localUser.firstName,
          lastName: localUser.lastName,
          email: localUser.email,
          phone: localUser.phone,
        },
        now
      )

      const loginResult = await this.deps.provider.login({
        email,
        password,
        clientId: this.clientId,
      })
      if (isAuthEvent(loginResult)) return pending(loginResult)

      await this.deps.repository.updateUser(localUser.id, {
        emailVerified: loginResult.user.emailVerified,
        status: 'active',
        updatedAt: nowBigint,
      })
      return ok(loginResult)
    }

    const slug = await this.deps.resolveRegistrationSlug(
      organizationName,
      params.organizationSlug ?? null
    )

    let workosOrganizationId: string | null = null
    let localOrganizationCreated = false
    try {
      const organizationId = generateId('organization')
      const workosOrg = await this.deps.provider.createOrganization({
        name: organizationName,
        externalId: organizationId,
        metadata: {
          slug,
          owner_workos_user_id: workosUser.id,
          country_code: countryCode,
        },
      })
      workosOrganizationId = workosOrg.id

      const workosMembership =
        await this.deps.provider.createOrganizationMembership({
          userId: workosUser.id,
          organizationId: workosOrganizationId,
          roleSlug: 'admin',
        })

      const localOrg = await this.deps.repository.createOrganization({
        id: organizationId,
        workosOrganizationId,
        name: organizationName,
        slug,
        status: 'active',
        countryCode,
        // Compatibility placeholders only. `resolveFreshProvisioningPolicy()`
        // replaces these with the selected setup's v1 workspace defaults before
        // the first app entitlement/finance write.
        currencyCode: params.currencyCode?.trim().toUpperCase() || 'USD',
        language: params.language?.trim() || 'en',
        metadata: workosOrg.metadata ?? null,
        createdAt: nowBigint,
        updatedAt: nowBigint,
      })
      localOrganizationCreated = true

      await this.deps.repository.createMembership({
        id: generateId('membership'),
        organizationId: localOrg.id,
        userId: localUser.id,
        workosMembershipId: workosMembership.id,
        role: OWNER_ROLE_NAME,
        roleId: null,
        status: 'active',
        createdAt: nowBigint,
        updatedAt: nowBigint,
      })

      await this.deps.ensureDefaultContact(
        localOrg.id,
        {
          id: localUser.id,
          firstName: localUser.firstName,
          lastName: localUser.lastName,
          email: localUser.email,
          phone: localUser.phone,
        },
        now
      )

      // The first provisioning call resolves and persists the setup from the
      // country above before creating any setup-driven subscription/finance
      // state. Subsequent operations require/reuse that persisted decision.
      const orgRoles = await this.deps.provisionOrganization(localOrg.id, now, {
        sourceAppId: params.sourceAppId ?? null,
      })

      await this.deps.assignMemberApps({
        organizationId: localOrg.id,
        userId: localUser.id,
        now,
        sourceAppId: params.sourceAppId ?? null,
      })
      await this.deps.ensureWork(localOrg.id)

      const ownerRole = orgRoles[OWNER_ROLE_NAME]
      if (ownerRole?.id) {
        const membership = await this.deps.repository.findMembership(
          localOrg.id,
          localUser.id
        )
        if (membership) {
          await this.deps.repository.updateMembership(membership.id, {
            roleId: ownerRole.id,
            updatedAt: nowBigint,
          })
        }
      }

      const loginResult = await this.deps.provider.login({
        email,
        password,
        clientId: this.clientId,
      })

      if (isAuthEvent(loginResult)) return pending(loginResult)

      await this.deps.repository.updateUser(localUser.id, {
        emailVerified: loginResult.user.emailVerified,
        status: 'active',
        updatedAt: nowBigint,
      })
      return ok(loginResult)
    } catch (error) {
      // Once the local organization exists it is the durable retry anchor. Do
      // not delete the provider organization after a finance/Work/policy error;
      // the next attempt must reuse the same local org and persisted selection.
      if (!localOrganizationCreated && workosOrganizationId !== null) {
        try {
          await this.deps.provider.deleteOrganization(workosOrganizationId)
          log.info(
            {
              resource: 'organization',
              workos_organization_id: workosOrganizationId,
            },
            'auth.register_business.compensated'
          )
        } catch (compensationError) {
          log.warn(
            {
              err: compensationError,
              resource: 'organization',
              workos_organization_id: workosOrganizationId,
            },
            'auth.register_business.compensation_failed'
          )
        }
      }
      throw error
    }
  }

  async sendOtp(params: {
    email: string
  }): Promise<{ email: string; canResendAt: number }> {
    checkRequired(
      params.email,
      'auth/missing-email',
      'Please enter your email address.'
    )
    const email = validateEmail(params.email)

    const now = nowUnixSeconds()
    const challenge = await this.deps.repository.findEmailOtpChallenge(email)
    if (
      challenge?.canResendAt !== null &&
      challenge?.canResendAt !== undefined &&
      BigInt(now) < challenge.canResendAt
    ) {
      throw new AppHttpError({
        code: 'auth/too-many-requests',
        message: 'Resend cooldown has not elapsed.',
        httpStatus: 429,
      })
    }

    const magicAuth = await this.deps.provider.sendOtp(email, this.clientId)

    const deliveryUrl = this.otpDeliveryUrl
    if (deliveryUrl) {
      const code =
        typeof magicAuth.code === 'string' && magicAuth.code
          ? magicAuth.code
          : ''
      let delivered = false
      try {
        delivered = await this.deps.deliverOtp({
          url: deliveryUrl,
          email,
          code,
        })
      } catch {
        delivered = false
      }
      if (!delivered) {
        throw new AppHttpError({
          code: 'auth/internal-error',
          message:
            'An unexpected error occurred during authentication. Please try again later.',
          httpStatus: 500,
        })
      }
    }

    const challengeId =
      typeof magicAuth.id === 'string' && magicAuth.id
        ? magicAuth.id
        : 'dummy-id'
    const canResendAt = now + 300
    const expiresAt = now + 900

    await this.deps.repository.upsertEmailOtpChallenge({
      email,
      pendingAuthToken: challengeId,
      emailVerificationId: challengeId,
      canResendAt: BigInt(canResendAt),
      expiresAt: BigInt(expiresAt),
      createdAt: BigInt(now),
      updatedAt: BigInt(now),
    })

    return { email, canResendAt }
  }

  async verifyOtp(params: {
    code: string
    email: string
  }): Promise<ServiceAuthResult> {
    checkRequired(
      params.email,
      'auth/missing-email',
      'Please enter your email address.'
    )
    checkRequired(
      params.code,
      'auth/missing-code',
      'Please enter the verification code.'
    )

    const result = await this.deps.provider.verifyOtp({
      code: params.code,
      email: params.email,
      clientId: this.clientId,
    })
    return isAuthEvent(result) ? pending(result) : ok(result)
  }

  /** Send a password-recovery email. Returns the normalized address. */
  async sendRecovery(params: { email: string }): Promise<string> {
    checkRequired(
      params.email,
      'auth/missing-email',
      'Please enter your email address.'
    )
    const email = validateEmail(params.email)
    try {
      await this.deps.provider.sendRecovery(email, this.clientId)
    } catch (error) {
      if (isWorkOsNotFound(error)) return email
      throw error
    }
    return email
  }

  /** Reset a password from a recovery token. Returns the affected email. */
  async resetPassword(params: {
    token: string
    newPassword: string
  }): Promise<string> {
    checkRequired(
      params.token,
      'auth/invalid-token',
      'Invalid authentication token. Please sign in again.',
      401
    )
    const newPassword = validatePassword(params.newPassword)
    const user = await this.deps.provider.resetPassword(
      params.token,
      newPassword
    )
    return user.email
  }

  async verifyEmail(params: {
    code: string
    pendingAuthenticationToken: string
  }): Promise<ServiceAuthResult> {
    checkRequired(
      params.code,
      'auth/missing-code',
      'Please enter the verification code.'
    )
    checkRequired(
      params.pendingAuthenticationToken,
      'auth/invalid-token',
      'Invalid authentication token. Please sign in again.',
      401
    )

    const result = await this.deps.provider.verifyEmail({
      code: params.code,
      pendingAuthenticationToken: params.pendingAuthenticationToken,
      clientId: this.clientId,
    })

    if (isAuthEvent(result)) {
      throw new AppHttpError({
        code: 'auth/verification-failed',
        message: 'Email verification could not be completed. Please try again.',
        httpStatus: 401,
      })
    }

    const providerUser = result.user
    const email = validateEmail(providerUser.email)
    const now = BigInt(nowUnixSeconds())

    const localUser =
      (await this.deps.repository.findUserByWorkosId(providerUser.id)) ??
      (await this.deps.repository.findUserByEmail(email))

    if (localUser) {
      await this.deps.repository.updateUser(localUser.id, {
        workosUserId: providerUser.id,
        email,
        emailVerified: providerUser.emailVerified,
        firstName: providerUser.firstName || localUser.firstName,
        lastName: providerUser.lastName || localUser.lastName,
        avatar: providerUser.avatar || localUser.avatar,
        status: 'active',
        updatedAt: now,
      })
    } else {
      const isOwner = isPlatformOwnerEmail(email)
      await this.deps.repository.createUser({
        id: isOwner ? generatePlatformOwnerUserId() : generateId('user'),
        workosUserId: providerUser.id,
        email,
        emailVerified: providerUser.emailVerified,
        firstName: providerUser.firstName || 'Unknown',
        lastName: providerUser.lastName || 'User',
        avatar: providerUser.avatar,
        platformRole: isOwner ? 'owner' : null,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
    }

    return ok(result)
  }

  async authenticateWithCode(params: {
    code: string
    codeVerifier?: string | null
    invitationToken?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<ServiceAuthResult> {
    checkRequired(params.code, 'auth/invalid-input', 'Please check your input.')
    const result = await this.deps.provider.authenticateWithCode({
      code: params.code,
      clientId: this.clientId,
      codeVerifier: params.codeVerifier,
      invitationToken: params.invitationToken,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return isAuthEvent(result) ? pending(result) : ok(result)
  }

  async refresh(params: {
    refreshToken: string
    organizationId?: string | null
  }): Promise<ServiceAuthResult> {
    checkRequired(
      params.refreshToken,
      'auth/invalid-input',
      'Please check your input.'
    )
    const result = await this.deps.provider.refresh({
      refreshToken: params.refreshToken,
      clientId: this.clientId,
      organizationId: params.organizationId,
    })
    return isAuthEvent(result) ? pending(result) : ok(result)
  }

  getAuthorizationUrl(params: {
    provider: string
    screenHint?: string | null
    loginHint?: string | null
    redirectOrigin?: string | null
  }): string {
    const settings = getSettings()
    const redirectUri = resolveWorkosRedirectUri(
      settings.workos.redirectUri,
      params.redirectOrigin,
      settings.corsOrigins
    )
    if (!redirectUri) {
      throw new AppHttpError({
        code: 'auth/internal-error',
        message: 'WorkOS Redirect URI is not configured.',
        httpStatus: 500,
      })
    }
    return this.deps.provider.getAuthorizationUrl({
      clientId: this.clientId,
      redirectUri,
      provider: params.provider,
      screenHint: params.screenHint,
      loginHint: params.loginHint,
    })
  }
}

// ---------------------------------------------------------------------------
// Default wiring
// ---------------------------------------------------------------------------

function requireProviderId(
  record: Record<string, unknown>,
  resource: string
): { id: string; metadata?: unknown } {
  const id = record['id']
  if (typeof id !== 'string' || !id) {
    throw new AppHttpError({
      code: 'auth/internal-error',
      message:
        'An unexpected error occurred during authentication. Please try again later.',
      httpStatus: 502,
      description: `WorkOS returned no id for ${resource}.`,
    })
  }
  return { id, metadata: record['metadata'] }
}

async function postOtpCode(params: {
  url: string
  email: string
  code: string
}): Promise<boolean> {
  const response = await fetch(params.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: params.email,
      code: params.code,
      type: 'magic_otp',
    }),
    signal: AbortSignal.timeout(10_000),
  })
  return response.ok
}

/** The service wired to the real repository, provider, and ported services. */
export function createAuthService(): AuthService {
  const settings = getSettings()
  const workos = getAuthProvider(settings)

  return new AuthService({
    provider: {
      login: (params) => workos.login(params),
      register: (params) => workos.register(params),
      getUserByEmail: (email) => workos.getUserByEmail(email),
      sendVerificationEmail: (userId) => workos.sendVerificationEmail(userId),
      sendOtp: (email, clientId) => workos.sendOtp(email, clientId),
      verifyOtp: (params) => workos.verifyOtp(params),
      sendRecovery: (email, clientId) => workos.sendRecovery(email, clientId),
      resetPassword: (token, newPassword) =>
        workos.resetPassword(token, newPassword),
      verifyEmail: (params) => workos.verifyEmail(params),
      authenticateWithCode: (params) => workos.authenticateWithCode(params),
      refresh: (params) => workos.refresh(params),
      createOrganization: async (params) =>
        requireProviderId(
          await workos.createOrganization(params),
          'organization'
        ),
      createOrganizationMembership: async (params) =>
        requireProviderId(
          await workos.createOrganizationMembership(params),
          'organization membership'
        ),
      deleteOrganization: (organizationId) =>
        workos.deleteOrganization(organizationId),
      getAuthorizationUrl: (params) => workos.getAuthorizationUrl(params),
    },
    repository,
    resolveRegistrationSlug: (name, slug) =>
      resolveRegistrationSlug(createOrganizationBootstrapDeps(), name, slug),
    provisionOrganization: (organizationId, now, options) =>
      provisionOrganization(organizationId, now, options),
    assignMemberApps: (params) => assignMemberApps(params),
    ensureWork: (organizationId) =>
      workspace.work.ensure({ organizationId }),
    ensureDefaultContact: (organizationId, user, now) =>
      ensureDefaultContact(organizationId, user, now),
    deliverOtp: postOtpCode,
  })
}
