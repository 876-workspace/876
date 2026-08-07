import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/http/errors'
import type { AuthEvent, AuthSession, ProviderUser } from '@/providers/auth'
import type { Mocked } from '@/test/mocked'

import {
  AuthService,
  callbackUriFromOrigin,
  invalidCredentialsMessage,
  isLocalOrigin,
  normalizeOrigin,
  normalizeUrl,
  resolveWorkosRedirectUri,
  validateEmail,
} from '../auth'
import type { AuthDeps, AuthProviderPort, AuthRepositoryPort } from '../auth'
import type { AuthUserRow } from '../auth.repository'

const NOW = 1_700_000_000
const CLIENT_ID = 'client_test'
const PASSWORD = 'sm2uTmv6InrQH6Az'

function providerUser(overrides: Partial<ProviderUser> = {}): ProviderUser {
  return {
    id: 'user_2kL9mN4q',
    email: 'alejandra@example.com',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    emailVerified: true,
    avatar: null,
    metadata: {},
    ...overrides,
  }
}

function authSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'at_live',
    refreshToken: 'rt_live',
    user: providerUser(),
    organizationId: null,
    ...overrides,
  }
}

function authEvent(overrides: Partial<AuthEvent> = {}): AuthEvent {
  return {
    kind: 'email_verification_required',
    email: 'alejandra@example.com',
    pendingToken: 'pending_abc',
    organizations: [],
    authFactors: [],
    connectionIds: [],
    ...overrides,
  }
}

function userRow(overrides: Partial<AuthUserRow> = {}): AuthUserRow {
  return {
    id: 'user_local_1',
    workosUserId: 'user_2kL9mN4q',
    email: 'alejandra@example.com',
    username: 'alejandra',
    emailVerified: true,
    firstName: 'Alejandra',
    lastName: 'Reyes',
    avatar: null,
    phone: null,
    platformRole: null,
    status: 'active',
    ...overrides,
  }
}

function makeProvider(): Mocked<AuthProviderPort> {
  return {
    login: vi.fn(),
    register: vi.fn(),
    getUserByEmail: vi.fn(),
    sendVerificationEmail: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    sendRecovery: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    authenticateWithCode: vi.fn(),
    refresh: vi.fn(),
    createOrganization: vi.fn(),
    createOrganizationMembership: vi.fn(),
    deleteOrganization: vi.fn(),
    getAuthorizationUrl: vi.fn(),
  } as unknown as Mocked<AuthProviderPort>
}

function makeRepository(): Mocked<AuthRepositoryPort> {
  return {
    findUserByUsername: vi.fn(),
    findUserByWorkosId: vi.fn(),
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    listConsumerDefaultFeatures: vi.fn(),
    upsertUserFeature: vi.fn(),
    hasAnyMembership: vi.fn(),
    createMembership: vi.fn(),
    createOrganization: vi.fn(),
    findEmailOtpChallenge: vi.fn(),
    upsertEmailOtpChallenge: vi.fn(),
  } as unknown as Mocked<AuthRepositoryPort>
}

type Harness = {
  service: AuthService
  provider: Mocked<AuthProviderPort>
  repository: Mocked<AuthRepositoryPort>
  deps: Mocked<
    Pick<
      AuthDeps,
      | 'resolveRegistrationSlug'
      | 'provisionOrganization'
      | 'assignMemberApps'
      | 'ensureDefaultContact'
      | 'deliverOtp'
    >
  >
}

function makeHarness(otpDeliveryUrl = ''): Harness {
  const provider = makeProvider()
  const repository = makeRepository()
  const deps = {
    resolveRegistrationSlug: vi.fn(),
    provisionOrganization: vi.fn(),
    assignMemberApps: vi.fn(),
    ensureDefaultContact: vi.fn(),
    deliverOtp: vi.fn(),
  } as unknown as Harness['deps']

  const service = new AuthService({
    provider,
    repository,
    ...deps,
    settings: { workosClientId: CLIENT_ID, otpDeliveryUrl },
  })

  return { service, provider, repository, deps }
}

// A frozen clock: every fixture below is expressed relative to NOW, and against
// the real clock the OTP cooldown assertions would compare against wall time.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('validateEmail', () => {
  it('lowercases and trims a valid address', () => {
    expect(validateEmail('  Alejandra@Example.COM ')).toBe(
      'alejandra@example.com'
    )
  })

  it('rejects an address with no @ as auth/invalid-email', () => {
    expect(() => validateEmail('not-an-email')).toThrowError(
      expect.objectContaining({
        code: 'auth/invalid-email',
        message: 'Please enter a valid email address.',
        httpStatus: 400,
      })
    )
  })
})

describe('invalidCredentialsMessage', () => {
  it.each([
    [undefined, 'The sign-in information you entered is incorrect.'],
    ['', 'The sign-in information you entered is incorrect.'],
    ['   ', 'The sign-in information you entered is incorrect.'],
    [
      'alejandra@example.com',
      'The email or password you entered is incorrect.',
    ],
    ['alejandra', 'The username or password you entered is incorrect.'],
  ])('names the field the caller typed for %p', (identifier, expected) => {
    expect(invalidCredentialsMessage(identifier)).toBe(expected)
  })
})

describe('URL helpers', () => {
  it.each([
    ['https://app.876.com/x', 'https://app.876.com'],
    ['  http://localhost:3000  ', 'http://localhost:3000'],
    ['ftp://example.com', null],
    ['not a url', null],
    ['', null],
    [null, null],
  ])('normalizeOrigin(%p)', (input, expected) => {
    expect(normalizeOrigin(input)).toBe(expected)
  })

  it('appends /callback to a normalized origin', () => {
    expect(callbackUriFromOrigin('https://app.876.com/anything')).toBe(
      'https://app.876.com/callback'
    )
  })

  it('returns null when the origin cannot be normalized', () => {
    expect(callbackUriFromOrigin('nope')).toBeNull()
  })

  it.each([
    ['https://api.876.com/callback/', 'https://api.876.com/callback'],
    ['javascript:alert(1)', null],
    ['', null],
  ])('normalizeUrl(%p)', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected)
  })

  it.each([
    ['http://localhost:3000', true],
    ['http://127.0.0.1:3000', true],
    ['https://app.876.com', false],
  ])('isLocalOrigin(%p)', (input, expected) => {
    expect(isLocalOrigin(input)).toBe(expected)
  })

  describe('resolveWorkosRedirectUri', () => {
    it('prefers a configured non-local URL over the request origin', () => {
      expect(
        resolveWorkosRedirectUri(
          'https://api.876.com/callback',
          'https://preview.876.dev'
        )
      ).toBe('https://api.876.com/callback')
    })

    it('uses the request origin when the configured URL is local-only', () => {
      expect(
        resolveWorkosRedirectUri(
          'http://localhost:3000/callback',
          'https://preview.876.dev'
        )
      ).toBe('https://preview.876.dev/callback')
    })

    it('uses the request origin when nothing is configured', () => {
      expect(resolveWorkosRedirectUri('', 'https://preview.876.dev')).toBe(
        'https://preview.876.dev/callback'
      )
    })

    it('falls back to the configured URL when the request has no origin', () => {
      expect(
        resolveWorkosRedirectUri('http://localhost:3000/callback', null)
      ).toBe('http://localhost:3000/callback')
    })

    it('returns null when neither is usable', () => {
      expect(resolveWorkosRedirectUri(null, 'nope')).toBeNull()
    })
  })
})

describe('AuthService.login', () => {
  it('resolves an email identifier and returns the session', async () => {
    const { service, provider, repository } = makeHarness()
    const session = authSession()
    provider.login.mockResolvedValue(session)

    const result = await service.login({
      identifier: ' Alejandra@Example.com ',
      password: PASSWORD,
    })

    expect(result).toEqual({ status: 'ok', session })
    expect(provider.login).toHaveBeenCalledTimes(1)
    expect(provider.login).toHaveBeenCalledWith({
      email: 'alejandra@example.com',
      password: PASSWORD,
      clientId: CLIENT_ID,
      ipAddress: undefined,
      userAgent: undefined,
    })
    expect(repository.findUserByUsername).not.toHaveBeenCalled()
  })

  it('resolves a username identifier through the local user row', async () => {
    const { service, provider, repository } = makeHarness()
    repository.findUserByUsername.mockResolvedValue(userRow())
    provider.login.mockResolvedValue(authSession())

    await service.login({ identifier: 'Alejandra', password: PASSWORD })

    expect(repository.findUserByUsername).toHaveBeenCalledWith('alejandra')
    expect(provider.login).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alejandra@example.com' })
    )
  })

  it('returns pending when the provider requires a further step', async () => {
    const { service, provider } = makeHarness()
    const event = authEvent()
    provider.login.mockResolvedValue(event)

    const result = await service.login({
      identifier: 'alejandra@example.com',
      password: PASSWORD,
    })

    expect(result).toEqual({ status: 'pending', event })
  })

  it('rejects a blank identifier without calling the provider', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.login({ identifier: '   ', password: PASSWORD })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'auth/missing-identifier',
        message: 'Please enter your username or email.',
        httpStatus: 400,
      })
    )
    expect(provider.login).not.toHaveBeenCalled()
  })

  it('rejects a blank password without calling the provider', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.login({ identifier: 'alejandra@example.com', password: '' })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/missing-password' })
    )
    expect(provider.login).not.toHaveBeenCalled()
  })

  it.each([['ab'], ['x'.repeat(33)], ['bad name!']])(
    'rejects the malformed username %p as auth/invalid-identifier',
    async (identifier) => {
      const { service, provider, repository } = makeHarness()

      await expect(
        service.login({ identifier, password: PASSWORD })
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'auth/invalid-identifier',
          httpStatus: 400,
        })
      )
      expect(repository.findUserByUsername).not.toHaveBeenCalled()
      expect(provider.login).not.toHaveBeenCalled()
    }
  )

  it('reports an unknown username as invalid credentials, not as not-found', async () => {
    const { service, provider, repository } = makeHarness()
    repository.findUserByUsername.mockResolvedValue(null)

    await expect(
      service.login({ identifier: 'ghost', password: PASSWORD })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'auth/invalid-credentials',
        message: 'The username or password you entered is incorrect.',
        httpStatus: 401,
      })
    )
    expect(provider.login).not.toHaveBeenCalled()
  })

  it('rewords a credential failure to name the field the caller typed', async () => {
    const { service, provider } = makeHarness()
    provider.login.mockRejectedValue(
      new AppHttpError({
        code: 'auth/invalid-credentials',
        message: 'Invalid credentials.',
        httpStatus: 401,
      })
    )

    await expect(
      service.login({ identifier: 'alejandra@example.com', password: PASSWORD })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'auth/invalid-credentials',
        message: 'The email or password you entered is incorrect.',
        httpStatus: 401,
      })
    )
  })

  it('passes any other provider failure through unchanged', async () => {
    const { service, provider } = makeHarness()
    const banned = new AppHttpError({
      code: 'auth/user-banned',
      message: 'This account has been suspended.',
      httpStatus: 403,
    })
    provider.login.mockRejectedValue(banned)

    await expect(
      service.login({ identifier: 'alejandra@example.com', password: PASSWORD })
    ).rejects.toBe(banned)
  })
})

describe('AuthService.register', () => {
  function arrangeNewUser(harness: Harness) {
    harness.provider.register.mockResolvedValue(providerUser())
    harness.repository.findUserByWorkosId.mockResolvedValue(null)
    harness.repository.createUser.mockResolvedValue(userRow())
    harness.repository.listConsumerDefaultFeatures.mockResolvedValue([
      { id: 'feature_1' },
    ])
    harness.repository.updateUser.mockResolvedValue(userRow())
  }

  it('creates the local user, grants defaults, and activates on a session', async () => {
    const harness = makeHarness()
    arrangeNewUser(harness)
    const session = authSession()
    harness.provider.login.mockResolvedValue(session)

    const result = await harness.service.register({
      email: 'Alejandra@Example.com',
      password: PASSWORD,
      firstName: ' Alejandra ',
      lastName: 'Reyes',
    })

    expect(result).toEqual({ status: 'ok', session })
    expect(harness.repository.createUser).toHaveBeenCalledTimes(1)
    expect(harness.repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        workosUserId: 'user_2kL9mN4q',
        email: 'alejandra@example.com',
        status: 'inactive',
        platformRole: null,
        createdAt: BigInt(NOW),
        updatedAt: BigInt(NOW),
      })
    )
    expect(harness.repository.upsertUserFeature).toHaveBeenCalledTimes(1)
    expect(harness.repository.upsertUserFeature).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_local_1',
        featureId: 'feature_1',
        status: 'enabled',
      })
    )
    expect(harness.repository.updateUser).toHaveBeenCalledWith('user_local_1', {
      emailVerified: true,
      status: 'active',
      updatedAt: BigInt(NOW),
    })
  })

  it('returns pending and does not activate when verification is required', async () => {
    const harness = makeHarness()
    arrangeNewUser(harness)
    const event = authEvent()
    harness.provider.login.mockResolvedValue(event)

    const result = await harness.service.register({
      email: 'alejandra@example.com',
      password: PASSWORD,
      firstName: 'Alejandra',
      lastName: 'Reyes',
    })

    expect(result).toEqual({ status: 'pending', event })
    expect(harness.repository.updateUser).not.toHaveBeenCalled()
  })

  it('does not re-create or re-grant for an already-known provider user', async () => {
    const harness = makeHarness()
    harness.provider.register.mockResolvedValue(providerUser())
    harness.repository.findUserByWorkosId.mockResolvedValue(userRow())
    harness.repository.updateUser.mockResolvedValue(userRow())
    harness.provider.login.mockResolvedValue(authSession())

    await harness.service.register({
      email: 'alejandra@example.com',
      password: PASSWORD,
      firstName: 'Alejandra',
      lastName: 'Reyes',
    })

    expect(harness.repository.createUser).not.toHaveBeenCalled()
    expect(
      harness.repository.listConsumerDefaultFeatures
    ).not.toHaveBeenCalled()
  })

  it.each([
    ['short', 'auth/invalid-password'],
    ['', 'auth/missing-password'],
  ])('rejects the password %p as %s', async (password, code) => {
    const { service, provider } = makeHarness()

    await expect(
      service.register({
        email: 'alejandra@example.com',
        password,
        firstName: 'Alejandra',
        lastName: 'Reyes',
      })
    ).rejects.toThrowError(expect.objectContaining({ code }))
    expect(provider.register).not.toHaveBeenCalled()
  })

  it.each([
    ['firstName', 'auth/missing-first-name'],
    ['lastName', 'auth/missing-last-name'],
    ['email', 'auth/missing-email'],
  ])('rejects a blank %s as %s', async (field, code) => {
    const { service, provider } = makeHarness()
    const params = {
      email: 'alejandra@example.com',
      password: PASSWORD,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      [field]: '  ',
    }

    await expect(service.register(params)).rejects.toThrowError(
      expect.objectContaining({ code })
    )
    expect(provider.register).not.toHaveBeenCalled()
  })

  describe('adopting an existing provider account', () => {
    const emailExists = new AppHttpError({
      code: 'auth/email-already-exists',
      message: 'exists',
      httpStatus: 409,
    })

    it('adopts the account when the submitted password logs in', async () => {
      const harness = makeHarness()
      harness.provider.register.mockRejectedValue(emailExists)
      harness.provider.login.mockResolvedValue(authSession())
      harness.repository.findUserByWorkosId.mockResolvedValue(userRow())
      harness.repository.updateUser.mockResolvedValue(userRow())

      const result = await harness.service.register({
        email: 'alejandra@example.com',
        password: PASSWORD,
        firstName: 'Alejandra',
        lastName: 'Reyes',
      })

      expect(result.status).toBe('ok')
      expect(harness.provider.getUserByEmail).not.toHaveBeenCalled()
    })

    it('adopts on a credential-proven event and resends the verification code', async () => {
      const harness = makeHarness()
      harness.provider.register.mockRejectedValue(emailExists)
      harness.provider.login
        .mockResolvedValueOnce(authEvent())
        .mockResolvedValueOnce(authEvent())
      harness.provider.getUserByEmail.mockResolvedValue(providerUser())
      harness.repository.findUserByWorkosId.mockResolvedValue(userRow())

      const result = await harness.service.register({
        email: 'alejandra@example.com',
        password: PASSWORD,
        firstName: 'Alejandra',
        lastName: 'Reyes',
      })

      expect(result.status).toBe('pending')
      expect(harness.provider.sendVerificationEmail).toHaveBeenCalledTimes(1)
      expect(harness.provider.sendVerificationEmail).toHaveBeenCalledWith(
        'user_2kL9mN4q'
      )
    })

    it('refuses to adopt on an event kind that does not prove the password', async () => {
      const harness = makeHarness()
      harness.provider.register.mockRejectedValue(emailExists)
      harness.provider.login.mockResolvedValue(
        authEvent({ kind: 'sso_required' })
      )

      await expect(
        harness.service.register({
          email: 'alejandra@example.com',
          password: PASSWORD,
          firstName: 'Alejandra',
          lastName: 'Reyes',
        })
      ).rejects.toThrowError(
        expect.objectContaining({
          code: 'auth/email-already-exists',
          httpStatus: 409,
        })
      )
      expect(harness.provider.getUserByEmail).not.toHaveBeenCalled()
      expect(harness.repository.createUser).not.toHaveBeenCalled()
    })

    it('refuses to adopt when the login attempt itself fails', async () => {
      const harness = makeHarness()
      harness.provider.register.mockRejectedValue(emailExists)
      harness.provider.login.mockRejectedValue(
        new AppHttpError({
          code: 'auth/invalid-credentials',
          message: 'nope',
          httpStatus: 401,
        })
      )

      await expect(
        harness.service.register({
          email: 'alejandra@example.com',
          password: PASSWORD,
          firstName: 'Alejandra',
          lastName: 'Reyes',
        })
      ).rejects.toThrowError(
        expect.objectContaining({ code: 'auth/email-already-exists' })
      )
      expect(harness.repository.createUser).not.toHaveBeenCalled()
    })

    it('does not swallow a registration failure outside the two known codes', async () => {
      const harness = makeHarness()
      const unexpected = new AppHttpError({
        code: 'auth/provider-unavailable',
        message: 'down',
        httpStatus: 503,
      })
      harness.provider.register.mockRejectedValue(unexpected)

      await expect(
        harness.service.register({
          email: 'alejandra@example.com',
          password: PASSWORD,
          firstName: 'Alejandra',
          lastName: 'Reyes',
        })
      ).rejects.toBe(unexpected)
      expect(harness.provider.login).not.toHaveBeenCalled()
    })
  })
})

describe('AuthService.registerBusiness', () => {
  function arrange(harness: Harness) {
    harness.deps.resolveRegistrationSlug.mockResolvedValue('reyes-logistics')
    harness.provider.register.mockResolvedValue(providerUser())
    harness.repository.findUserByWorkosId.mockResolvedValue(null)
    harness.repository.createUser.mockResolvedValue(userRow())
    harness.provider.createOrganization.mockResolvedValue({
      id: 'org_workos_1',
      metadata: { slug: 'reyes-logistics' },
    })
    harness.provider.createOrganizationMembership.mockResolvedValue({
      id: 'om_1',
    })
    harness.repository.createOrganization.mockResolvedValue({
      id: 'organization_1',
      slug: 'reyes-logistics',
    })
    harness.deps.provisionOrganization.mockResolvedValue({
      owner: { id: 'role_owner' },
    })
    harness.repository.updateUser.mockResolvedValue(userRow())
  }

  it('creates the org, links the owner, assigns apps, and activates', async () => {
    const harness = makeHarness()
    arrange(harness)
    const session = authSession()
    harness.provider.login.mockResolvedValue(session)

    const result = await harness.service.registerBusiness({
      email: 'alejandra@example.com',
      password: PASSWORD,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      organizationName: ' Reyes Logistics ',
      sourceAppId: 'app_1',
    })

    expect(result).toEqual({ status: 'ok', session })
    expect(harness.provider.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Reyes Logistics',
        metadata: {
          slug: 'reyes-logistics',
          owner_workos_user_id: 'user_2kL9mN4q',
        },
      })
    )
    expect(harness.deps.provisionOrganization).toHaveBeenCalledWith(
      'organization_1',
      NOW,
      { sourceAppId: 'app_1' }
    )
    expect(harness.repository.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'organization_1',
        userId: 'user_local_1',
        workosMembershipId: 'om_1',
        role: 'owner',
        roleId: 'role_owner',
        status: 'active',
      })
    )
    expect(harness.deps.assignMemberApps).toHaveBeenCalledTimes(1)
    expect(harness.deps.ensureDefaultContact).toHaveBeenCalledTimes(1)
    expect(harness.repository.updateUser).toHaveBeenCalledWith('user_local_1', {
      emailVerified: true,
      status: 'active',
      updatedAt: BigInt(NOW),
    })
  })

  it('still attaches the owner as invited when verification is pending', async () => {
    const harness = makeHarness()
    arrange(harness)
    const event = authEvent()
    harness.provider.login.mockResolvedValue(event)

    const result = await harness.service.registerBusiness({
      email: 'alejandra@example.com',
      password: PASSWORD,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      organizationName: 'Reyes Logistics',
    })

    expect(result).toEqual({ status: 'pending', event })
    expect(harness.repository.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'invited' })
    )
    expect(harness.deps.ensureDefaultContact).toHaveBeenCalledTimes(1)
    // An unverified owner has no session, so no app assignment and no
    // activation — both wait for the verified sign-in.
    expect(harness.deps.assignMemberApps).not.toHaveBeenCalled()
    expect(harness.repository.updateUser).not.toHaveBeenCalled()
  })

  it('signs an adopted user with an existing membership in without creating an org', async () => {
    const harness = makeHarness()
    arrange(harness)
    harness.provider.register.mockRejectedValue(
      new AppHttpError({
        code: 'auth/email-already-exists',
        message: 'exists',
        httpStatus: 409,
      })
    )
    harness.provider.login.mockResolvedValue(authSession())
    harness.repository.findUserByWorkosId.mockResolvedValue(userRow())
    harness.repository.hasAnyMembership.mockResolvedValue(true)

    const result = await harness.service.registerBusiness({
      email: 'alejandra@example.com',
      password: PASSWORD,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      organizationName: 'Reyes Logistics',
    })

    expect(result.status).toBe('ok')
    expect(harness.provider.createOrganization).not.toHaveBeenCalled()
    expect(harness.repository.createOrganization).not.toHaveBeenCalled()
    expect(harness.repository.createMembership).not.toHaveBeenCalled()
  })

  it('deletes the provider organization when a later step fails', async () => {
    const harness = makeHarness()
    arrange(harness)
    const failure = new Error('database unavailable')
    harness.repository.createOrganization.mockRejectedValue(failure)

    await expect(
      harness.service.registerBusiness({
        email: 'alejandra@example.com',
        password: PASSWORD,
        firstName: 'Alejandra',
        lastName: 'Reyes',
        organizationName: 'Reyes Logistics',
      })
    ).rejects.toBe(failure)

    expect(harness.provider.deleteOrganization).toHaveBeenCalledTimes(1)
    expect(harness.provider.deleteOrganization).toHaveBeenCalledWith(
      'org_workos_1'
    )
  })

  it('does not compensate a failure that happened before the org was created', async () => {
    const harness = makeHarness()
    arrange(harness)
    const failure = new Error('workos unavailable')
    harness.provider.createOrganization.mockRejectedValue(failure)

    await expect(
      harness.service.registerBusiness({
        email: 'alejandra@example.com',
        password: PASSWORD,
        firstName: 'Alejandra',
        lastName: 'Reyes',
        organizationName: 'Reyes Logistics',
      })
    ).rejects.toBe(failure)

    expect(harness.provider.deleteOrganization).not.toHaveBeenCalled()
  })

  it('rejects a blank organization name before touching the provider', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.registerBusiness({
        email: 'alejandra@example.com',
        password: PASSWORD,
        firstName: 'Alejandra',
        lastName: 'Reyes',
        organizationName: '   ',
      })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/missing-organization-name' })
    )
    expect(provider.register).not.toHaveBeenCalled()
  })
})

describe('AuthService.sendOtp', () => {
  it('creates the challenge and returns the resend deadline', async () => {
    const { service, provider, repository } = makeHarness()
    repository.findEmailOtpChallenge.mockResolvedValue(null)
    provider.sendOtp.mockResolvedValue({ id: 'magic_1', code: '123456' })

    const result = await service.sendOtp({ email: 'Alejandra@Example.com' })

    expect(result).toEqual({
      email: 'alejandra@example.com',
      canResendAt: NOW + 300,
    })
    expect(repository.upsertEmailOtpChallenge).toHaveBeenCalledWith({
      email: 'alejandra@example.com',
      pendingAuthToken: 'magic_1',
      emailVerificationId: 'magic_1',
      canResendAt: BigInt(NOW + 300),
      expiresAt: BigInt(NOW + 900),
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    })
  })

  it('rejects a resend inside the cooldown window', async () => {
    const { service, provider, repository } = makeHarness()
    repository.findEmailOtpChallenge.mockResolvedValue({
      canResendAt: BigInt(NOW + 60),
    })

    await expect(
      service.sendOtp({ email: 'alejandra@example.com' })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'auth/too-many-requests',
        message: 'Resend cooldown has not elapsed.',
        httpStatus: 429,
      })
    )
    expect(provider.sendOtp).not.toHaveBeenCalled()
  })

  it('allows a resend once the cooldown has elapsed', async () => {
    const { service, provider, repository } = makeHarness()
    repository.findEmailOtpChallenge.mockResolvedValue({
      canResendAt: BigInt(NOW - 1),
    })
    provider.sendOtp.mockResolvedValue({ id: 'magic_2', code: '654321' })

    await expect(
      service.sendOtp({ email: 'alejandra@example.com' })
    ).resolves.toEqual({
      email: 'alejandra@example.com',
      canResendAt: NOW + 300,
    })
  })

  it('falls back to a placeholder challenge id when the provider omits one', async () => {
    const { service, provider, repository } = makeHarness()
    repository.findEmailOtpChallenge.mockResolvedValue(null)
    provider.sendOtp.mockResolvedValue({})

    await service.sendOtp({ email: 'alejandra@example.com' })

    expect(repository.upsertEmailOtpChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingAuthToken: 'dummy-id',
        emailVerificationId: 'dummy-id',
      })
    )
  })

  it('delivers the code out-of-band when a delivery URL is configured', async () => {
    const harness = makeHarness('https://mail.876.com/otp')
    harness.repository.findEmailOtpChallenge.mockResolvedValue(null)
    harness.provider.sendOtp.mockResolvedValue({ id: 'm1', code: '123456' })
    harness.deps.deliverOtp.mockResolvedValue(true)

    await harness.service.sendOtp({ email: 'alejandra@example.com' })

    expect(harness.deps.deliverOtp).toHaveBeenCalledTimes(1)
    expect(harness.deps.deliverOtp).toHaveBeenCalledWith({
      url: 'https://mail.876.com/otp',
      email: 'alejandra@example.com',
      code: '123456',
    })
  })

  it('fails the request, without storing a challenge, when delivery fails', async () => {
    const harness = makeHarness('https://mail.876.com/otp')
    harness.repository.findEmailOtpChallenge.mockResolvedValue(null)
    harness.provider.sendOtp.mockResolvedValue({ id: 'm1', code: '123456' })
    harness.deps.deliverOtp.mockResolvedValue(false)

    await expect(
      harness.service.sendOtp({ email: 'alejandra@example.com' })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'auth/internal-error',
        httpStatus: 500,
      })
    )
    expect(harness.repository.upsertEmailOtpChallenge).not.toHaveBeenCalled()
  })

  it('maps a transport failure to the same internal error, leaking nothing', async () => {
    const harness = makeHarness('https://mail.876.com/otp')
    harness.repository.findEmailOtpChallenge.mockResolvedValue(null)
    harness.provider.sendOtp.mockResolvedValue({ id: 'm1', code: '123456' })
    harness.deps.deliverOtp.mockRejectedValue(
      new Error('ECONNREFUSED 10.0.0.4:8025')
    )

    await expect(
      harness.service.sendOtp({ email: 'alejandra@example.com' })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'auth/internal-error',
        message:
          'An unexpected error occurred during authentication. Please try again later.',
      })
    )
  })

  it('skips delivery entirely when no URL is configured', async () => {
    const harness = makeHarness('')
    harness.repository.findEmailOtpChallenge.mockResolvedValue(null)
    harness.provider.sendOtp.mockResolvedValue({ id: 'm1', code: '123456' })

    await harness.service.sendOtp({ email: 'alejandra@example.com' })

    expect(harness.deps.deliverOtp).not.toHaveBeenCalled()
  })
})

describe('AuthService.verifyOtp', () => {
  it('returns the session on success', async () => {
    const { service, provider } = makeHarness()
    const session = authSession()
    provider.verifyOtp.mockResolvedValue(session)

    await expect(
      service.verifyOtp({ code: '123456', email: 'alejandra@example.com' })
    ).resolves.toEqual({ status: 'ok', session })
    expect(provider.verifyOtp).toHaveBeenCalledWith({
      code: '123456',
      email: 'alejandra@example.com',
      clientId: CLIENT_ID,
    })
  })

  it('rejects a blank code without calling the provider', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.verifyOtp({ code: ' ', email: 'alejandra@example.com' })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/missing-code' })
    )
    expect(provider.verifyOtp).not.toHaveBeenCalled()
  })
})

describe('AuthService.sendRecovery', () => {
  it('returns the normalized email on success', async () => {
    const { service, provider } = makeHarness()
    provider.sendRecovery.mockResolvedValue(undefined)

    await expect(
      service.sendRecovery({ email: ' Alejandra@Example.com ' })
    ).resolves.toBe('alejandra@example.com')
  })

  it('swallows the unknown-user 404 so accounts cannot be enumerated', async () => {
    const { service, provider } = makeHarness()
    provider.sendRecovery.mockRejectedValue(
      new AppHttpError({
        code: 'auth/oauth-failed',
        message: 'not found',
        httpStatus: 404,
      })
    )

    await expect(
      service.sendRecovery({ email: 'ghost@example.com' })
    ).resolves.toBe('ghost@example.com')
  })

  it('does not swallow the same code at a different status', async () => {
    const { service, provider } = makeHarness()
    const failure = new AppHttpError({
      code: 'auth/oauth-failed',
      message: 'bad request',
      httpStatus: 400,
    })
    provider.sendRecovery.mockRejectedValue(failure)

    await expect(
      service.sendRecovery({ email: 'alejandra@example.com' })
    ).rejects.toBe(failure)
  })
})

describe('AuthService.resetPassword', () => {
  it('returns the affected email', async () => {
    const { service, provider } = makeHarness()
    provider.resetPassword.mockResolvedValue(providerUser())

    await expect(
      service.resetPassword({ token: 'tok_1', newPassword: PASSWORD })
    ).resolves.toBe('alejandra@example.com')
    expect(provider.resetPassword).toHaveBeenCalledWith('tok_1', PASSWORD)
  })

  it('rejects a blank token as a 401 without calling the provider', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.resetPassword({ token: '  ', newPassword: PASSWORD })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/invalid-token', httpStatus: 401 })
    )
    expect(provider.resetPassword).not.toHaveBeenCalled()
  })

  it('rejects a short password without calling the provider', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.resetPassword({ token: 'tok_1', newPassword: 'short' })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/invalid-password' })
    )
    expect(provider.resetPassword).not.toHaveBeenCalled()
  })
})

describe('AuthService.verifyEmail', () => {
  it('repairs a stale provider link on the existing local user', async () => {
    const { service, provider, repository } = makeHarness()
    provider.verifyEmail.mockResolvedValue(authSession())
    repository.findUserByWorkosId.mockResolvedValue(null)
    repository.findUserByEmail.mockResolvedValue(
      userRow({ workosUserId: 'user_stale', avatar: 'https://old.png' })
    )
    repository.updateUser.mockResolvedValue(userRow())

    const result = await service.verifyEmail({
      code: '123456',
      pendingAuthenticationToken: 'pending_abc',
    })

    expect(result.status).toBe('ok')
    expect(repository.updateUser).toHaveBeenCalledWith('user_local_1', {
      workosUserId: 'user_2kL9mN4q',
      email: 'alejandra@example.com',
      emailVerified: true,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      avatar: 'https://old.png',
      status: 'active',
      updatedAt: BigInt(NOW),
    })
    expect(repository.createUser).not.toHaveBeenCalled()
  })

  it('creates the local user when none exists, with the documented fallbacks', async () => {
    const { service, provider, repository } = makeHarness()
    provider.verifyEmail.mockResolvedValue(
      authSession({
        user: providerUser({ firstName: null, lastName: null }),
      })
    )
    repository.findUserByWorkosId.mockResolvedValue(null)
    repository.findUserByEmail.mockResolvedValue(null)
    repository.createUser.mockResolvedValue(userRow())

    await service.verifyEmail({
      code: '123456',
      pendingAuthenticationToken: 'pending_abc',
    })

    expect(repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Unknown',
        lastName: 'User',
        status: 'active',
        platformRole: null,
      })
    )
  })

  it('treats a post-verification auth event as a failure, not a pending step', async () => {
    const { service, provider, repository } = makeHarness()
    provider.verifyEmail.mockResolvedValue(authEvent({ kind: 'mfa_challenge' }))

    await expect(
      service.verifyEmail({
        code: '123456',
        pendingAuthenticationToken: 'pending_abc',
      })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'auth/verification-failed',
        httpStatus: 401,
      })
    )
    expect(repository.updateUser).not.toHaveBeenCalled()
    expect(repository.createUser).not.toHaveBeenCalled()
  })

  it('rejects a blank pending token as a 401', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.verifyEmail({ code: '123456', pendingAuthenticationToken: '' })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/invalid-token', httpStatus: 401 })
    )
    expect(provider.verifyEmail).not.toHaveBeenCalled()
  })
})

describe('AuthService.authenticateWithCode', () => {
  it('passes every transport field through and returns the session', async () => {
    const { service, provider } = makeHarness()
    const session = authSession()
    provider.authenticateWithCode.mockResolvedValue(session)

    await expect(
      service.authenticateWithCode({
        code: 'code_1',
        codeVerifier: 'verifier',
        invitationToken: 'invite',
        ipAddress: '203.0.113.7',
        userAgent: 'Mozilla/5.0',
      })
    ).resolves.toEqual({ status: 'ok', session })
    expect(provider.authenticateWithCode).toHaveBeenCalledWith({
      code: 'code_1',
      clientId: CLIENT_ID,
      codeVerifier: 'verifier',
      invitationToken: 'invite',
      ipAddress: '203.0.113.7',
      userAgent: 'Mozilla/5.0',
    })
  })

  it('rejects a blank code as auth/invalid-input', async () => {
    const { service, provider } = makeHarness()

    await expect(
      service.authenticateWithCode({ code: '' })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/invalid-input' })
    )
    expect(provider.authenticateWithCode).not.toHaveBeenCalled()
  })
})

describe('AuthService.refresh', () => {
  it('returns the refreshed session', async () => {
    const { service, provider } = makeHarness()
    const session = authSession()
    provider.refresh.mockResolvedValue(session)

    await expect(
      service.refresh({ refreshToken: 'rt_1', organizationId: 'org_1' })
    ).resolves.toEqual({ status: 'ok', session })
    expect(provider.refresh).toHaveBeenCalledWith({
      refreshToken: 'rt_1',
      clientId: CLIENT_ID,
      organizationId: 'org_1',
    })
  })

  it('returns pending when the refresh needs an organization choice', async () => {
    const { service, provider } = makeHarness()
    const event = authEvent({ kind: 'organization_selection_required' })
    provider.refresh.mockResolvedValue(event)

    await expect(service.refresh({ refreshToken: 'rt_1' })).resolves.toEqual({
      status: 'pending',
      event,
    })
  })

  it('rejects a blank refresh token as auth/invalid-input', async () => {
    const { service, provider } = makeHarness()

    await expect(service.refresh({ refreshToken: '  ' })).rejects.toThrowError(
      expect.objectContaining({ code: 'auth/invalid-input' })
    )
    expect(provider.refresh).not.toHaveBeenCalled()
  })
})
