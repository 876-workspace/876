import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876Client } from './index.ts'

const sessionPayload = {
  object: 'session',
  user: {
    object: 'user',
    id: 'user_4XmK9wQr',
    email: 'dexter.upton@hotmail.com',
    avatar: null,
    firstName: 'Dexter',
    lastName: 'Upton',
    emailVerified: true,
    lastSignInAt: null,
    locale: 'en',
    createdAt: '2023-06-01T00:00:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
    externalId: null,
    metadata: {},
  },
  expiresAt: null,
} as const

// The FastAPI auth routes serialize with `response_model_exclude_none=True`,
// so nullable user fields (stripeCustomerId, username, middleName, avatar) are
// omitted entirely and sessionMeta.expiresAt is a Unix-seconds int.
const apiSessionPayload = {
  object: 'session',
  user: {
    object: 'user',
    id: 'user_testowner000000000000000000',
    email: 'dexter.upton@hotmail.com',
    emailVerified: true,
    firstName: 'Dexter',
    lastName: 'Upton',
    status: 'active',
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
  sessionMeta: {
    object: 'session',
    userId: 'user_testowner000000000000000000',
    expiresAt: 1700604800,
  },
} as const

const loginParams = {
  identifier: 'dexter.upton@hotmail.com',
  password: 'secure-password',
} as const

describe('create876Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('posts login requests to the resolved API base URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login(loginParams)

    expect(result).toEqual({ data: sessionPayload, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(loginParams),
    })
  })

  it('accepts the bare API session shape with exclude_none fields omitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(apiSessionPayload),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login(loginParams)

    expect(result).toEqual({ data: apiSessionPayload, error: null })
  })

  it('accepts a session user carrying the legacy accountType field', async () => {
    // Mirrors the deployed (pre-realm-refactor) API, which still serializes
    // `accountType` on the session user. The strict schema must tolerate it
    // instead of failing with auth/invalid-response.
    const legacyPayload = {
      object: 'session',
      user: {
        object: 'user',
        id: 'user_testowner000000000000000000',
        email: 'owner@example.com',
        username: 'owner',
        accountType: 'enterprise',
        emailVerified: true,
        firstName: 'Owner',
        lastName: 'Example',
        status: 'active',
        createdAt: 1779741556,
        updatedAt: 1781363130,
      },
    } as const
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(legacyPayload),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login(loginParams)

    expect(result.error).toBeNull()
    expect(result.data).toEqual(legacyPayload)
  })

  it('accepts an auth_event challenge without an email field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          object: 'auth_event',
          type: 'email_verification_required',
          pendingAuthenticationToken: 'pat_123',
        }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login(loginParams)

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ object: 'auth_event' })
  })

  it('adds the app API key header when an apiKey is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({
      apiKey: '876_app_secret_test_123',
      fetch: fetchMock,
    })

    const result = await $876.auth.login(loginParams)

    expect(result).toEqual({ data: sessionPayload, error: null })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-876-API-Key': '876_app_secret_test_123',
      },
      credentials: 'include',
      body: JSON.stringify(loginParams),
    })
  })

  it('uses an explicit base URL when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({
      baseUrl: 'https://api.example.com',
      fetch: fetchMock,
    })

    await $876.auth.login(loginParams)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/auth/login',
      expect.any(Object)
    )
  })

  it('defaults to the deployed API URL in production when no URL is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    await $876.auth.login(loginParams)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://eight76-api.onrender.com/auth/login',
      expect.any(Object)
    )
  })

  it('derives the forwarded API URL in Codespaces browser development', async () => {
    const originalLocation = globalThis.location
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        hostname: 'careful-space-abc123-3000.app.github.dev',
        protocol: 'https:',
      },
    })

    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })

    try {
      const $876 = create876Client({ fetch: fetchMock })

      await $876.auth.login(loginParams)

      expect(fetchMock).toHaveBeenCalledWith(
        'https://careful-space-abc123-4000.app.github.dev/auth/login',
        expect.any(Object)
      )
    } finally {
      Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  })

  it('uses a relative same-origin base URL when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({
      baseUrl: '/api',
      fetch: fetchMock,
    })

    await $876.auth.login(loginParams)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.any(Object)
    )
  })

  it('ignores blank optional client configuration values', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({
      apiKey: '',
      baseUrl: '/api',
      fetch: fetchMock,
    })

    await $876.auth.login(loginParams)

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(loginParams),
    })
  })

  it('returns a field-specific error without sending a request when auth params fail validation', async () => {
    const fetchMock = vi.fn()
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login({
      identifier: 'not-an-email',
      password: '',
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'auth/missing-password',
        message: 'Please enter your password.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns invalid-input when auth params include unexpected fields', async () => {
    const fetchMock = vi.fn()
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login({
      identifier: 'dexter.upton@hotmail.com',
      password: 'secure-password',
      redirectTo: '/dashboard',
    } as unknown as Parameters<typeof $876.auth.login>[0])

    expect(result).toEqual({
      data: null,
      error: {
        code: 'auth/invalid-input',
        message: 'Please check your input.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns an email-specific invalid credentials message for email login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            code: 'auth/invalid-credentials',
            message: 'Provider leaked text.',
            param: 'email',
          },
        }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login({
      identifier: 'dexter.upton@hotmail.com',
      password: 'wrong-password',
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'auth/invalid-credentials',
        message: 'The email or password you entered is incorrect.',
      },
    })
  })

  it('returns a username-specific invalid credentials message for username login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            code: 'auth/invalid-credentials',
            message: 'Provider leaked text.',
          },
        }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login({
      identifier: 'dexter',
      password: 'wrong-password',
    })

    expect(result).toEqual({
      data: null,
      error: {
        code: 'auth/invalid-credentials',
        message: 'The username or password you entered is incorrect.',
      },
    })
  })

  it('accepts direct success responses from the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(sessionPayload),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login(loginParams)

    expect(result).toEqual({ data: sessionPayload, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns invalid-response when a success response contains redirect fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          data: { ...sessionPayload, redirectTo: '/dashboard' },
          error: null,
        }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login(loginParams)

    expect(result).toEqual({
      data: null,
      error: {
        code: 'auth/invalid-response',
        message: 'Unexpected auth response. Please try again.',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('passes through backend auth errors that are not SDK-local errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: {
            code: 'auth/provider-disabled',
            message:
              'This sign-in method is currently unavailable. Please try another method.',
          },
        }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    const result = await $876.auth.login(loginParams)

    expect(result).toEqual({
      data: null,
      error: {
        code: 'auth/provider-disabled',
        message:
          'This sign-in method is currently unavailable. Please try another method.',
      },
    })
  })

  it('passes request abort signals to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({ fetch: fetchMock })
    const controller = new AbortController()

    await $876.auth.login(loginParams, { signal: controller.signal })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('passes request IDs to fetch for log correlation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({ fetch: fetchMock })

    await $876.auth.login(loginParams, { requestId: 'req_test' })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'req_test',
      },
      credentials: 'include',
      body: JSON.stringify(loginParams),
    })
  })

  it('uses the configured credentials mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: sessionPayload, error: null }),
    })
    const $876 = create876Client({
      fetch: fetchMock,
      credentials: 'same-origin',
    })

    await $876.auth.login(loginParams)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'same-origin' })
    )
  })

  describe('getProviders()', () => {
    const providerList = {
      object: 'list',
      data: [
        {
          object: 'auth_provider',
          id: 'google',
          label: 'Google',
          icon_slug: 'google',
        },
      ],
      has_more: false,
      url: '/auth/providers',
      total_count: 1,
    } as const

    it('fetches the enabled provider list', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(providerList),
      })
      const $876 = create876Client({ fetch: fetchMock })

      const result = await $876.auth.getProviders()

      expect(result).toEqual({ data: providerList, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/auth/providers',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('retries transient provider list responses', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: () =>
            Promise.resolve({
              error: { code: 'auth/network-error', message: 'Unavailable.' },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(providerList),
        })
      const $876 = create876Client({ fetch: fetchMock })

      const result = await $876.auth.getProviders()

      expect(result).toEqual({ data: providerList, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('createSessionFromOAuth()', () => {
    it('posts an OAuth id token to the session bridge endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ data: sessionPayload, error: null }),
      })
      const $876 = create876Client({
        apiKey: '876_app_secret_test_123',
        fetch: fetchMock,
      })

      const result = await $876.auth.createSessionFromOAuth({
        idToken: 'id_token_123',
      })

      expect(result).toEqual({ data: sessionPayload, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/auth/oauth/session',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-876-API-Key': '876_app_secret_test_123',
          },
          credentials: 'include',
          body: JSON.stringify({ id_token: 'id_token_123' }),
        }
      )
    })
  })

  describe('social login helpers', () => {
    const redirect = {
      url: 'https://accounts.google.com/o/oauth2/auth',
    } as const

    function socialFetch() {
      return vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ data: redirect, error: null }),
      })
    }

    it('social(provider) posts the provider to /auth/social-login', async () => {
      const fetchMock = socialFetch()
      const $876 = create876Client({ fetch: fetchMock })

      const result = await $876.auth.social('google', {
        screenHint: 'sign-up',
      })

      expect(result).toEqual({ data: redirect, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/auth/social-login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            provider: 'google',
            screenHint: 'sign-up',
          }),
        })
      )
    })

    it('loginWithGoogle() defaults the provider to google', async () => {
      const fetchMock = socialFetch()
      const $876 = create876Client({ fetch: fetchMock })

      await $876.auth.loginWithGoogle()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4000/auth/social-login',
        expect.objectContaining({
          body: JSON.stringify({ provider: 'google' }),
        })
      )
    })
  })
})
