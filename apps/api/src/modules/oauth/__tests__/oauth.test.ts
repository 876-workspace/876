import { createHash } from 'node:crypto'

import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  app,
  user,
  oauthGrant,
  authorizationCode,
  session,
  oauthRefreshToken,
  apiKey,
} = vi.hoisted(() => ({
  app: { findFirst: vi.fn(), findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  oauthGrant: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  authorizationCode: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  oauthRefreshToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    app,
    user,
    oauthGrant,
    authorizationCode,
    session,
    oauthRefreshToken,
    apiKey,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')
const { signProviderJwt } = await import('@/platform/jwt')

const INTERNAL = { 'x-internal-key': 'test-internal-key' }
const USER_ID = 'user_2kL9'
const CLIENT_ID = 'client_876app'
const REDIRECT = 'https://app.876.test/callback'
const NOW = 1785000000

const sha256 = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex')
const sha256b64 = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('base64url')

function appRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app_4qR8',
    name: '876 App',
    slug: '876-app',
    clientId: CLIENT_ID,
    clientType: 'public',
    clientSecretHash: null,
    // `external` so consent is exercised; first-party kinds skip it.
    appKind: 'external',
    logoUrl: null,
    homepageUrl: null,
    allowedRedirectUris: [REDIRECT],
    allowedLogoutUris: ['https://app.876.test/goodbye'],
    scopesAllowed: ['openid', 'profile', 'email', 'offline_access'],
    ...overrides,
  }
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'alejandra@example.com',
    emailVerified: true,
    firstName: 'Alejandra',
    lastName: 'Reyes',
    avatar: null,
    ...overrides,
  }
}

function codeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'auc_1',
    userId: USER_ID,
    appId: 'app_4qR8',
    orgId: null,
    redirectUri: REDIRECT,
    codeChallenge: sha256b64('verifier-abc'),
    scope: 'openid profile',
    nonce: 'n-1',
    authTime: BigInt(NOW - 5),
    expiresAt: BigInt(NOW + 600),
    usedAt: null,
    app: appRow(),
    user: userRow(),
    ...overrides,
  }
}

function refreshRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ort_1',
    userId: USER_ID,
    appId: 'app_4qR8',
    sessionId: 'ses_1',
    scope: 'openid offline_access',
    expiresAt: BigInt(NOW + 86400),
    usedAt: null,
    revokedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)

  app.findFirst.mockResolvedValue(appRow())
  app.findUnique.mockResolvedValue(appRow())
  user.findUnique.mockResolvedValue(userRow())
  oauthGrant.findFirst.mockResolvedValue(null)
  oauthGrant.create.mockResolvedValue({})
  oauthGrant.update.mockResolvedValue({})
  authorizationCode.findUnique.mockResolvedValue(codeRow())
  authorizationCode.create.mockResolvedValue({})
  authorizationCode.updateMany.mockResolvedValue({ count: 1 })
  session.create.mockResolvedValue({})
  session.findUnique.mockResolvedValue(null)
  session.deleteMany.mockResolvedValue({ count: 1 })
  oauthRefreshToken.findUnique.mockResolvedValue(refreshRow())
  oauthRefreshToken.create.mockResolvedValue({})
  oauthRefreshToken.updateMany.mockResolvedValue({ count: 1 })
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /oauth/.well-known/openid-configuration', () => {
  it('is served raw, outside the platform envelope', async () => {
    // A standards-compliant OIDC client parses this document directly; wrapping
    // it in { data, error } would break every one of them.
    const response = await request(createApp()).get(
      '/oauth/.well-known/openid-configuration'
    )

    expect(response.status).toBe(200)
    expect(response.body).not.toHaveProperty('data')
    expect(response.body.response_types_supported).toEqual(['code'])
    expect(response.body.code_challenge_methods_supported).toEqual(['S256'])
    expect(response.body.grant_types_supported).toEqual([
      'authorization_code',
      'refresh_token',
      'client_credentials',
    ])
  })

  it('advertises exactly the scopes the registry defines', async () => {
    const response = await request(createApp()).get(
      '/oauth/.well-known/openid-configuration'
    )

    expect(response.body.scopes_supported).toContain('openid')
    expect(response.body.scopes_supported).toContain('offline_access')
    expect(response.body.claims_supported).toContain('email_verified')
  })
})

describe('GET /oauth/.well-known/jwks.json', () => {
  it('publishes the public key, raw and without the private half', async () => {
    const response = await request(createApp()).get(
      '/oauth/.well-known/jwks.json'
    )

    expect(response.status).toBe(200)
    expect(response.body).not.toHaveProperty('data')
    expect(response.body.keys).toHaveLength(1)
    expect(response.body.keys[0]).toMatchObject({ alg: 'RS256', use: 'sig' })
    // The private exponent must never be published.
    expect(response.body.keys[0]).not.toHaveProperty('d')
  })
})

describe('GET /oauth/authorize', () => {
  const QUERY =
    `response_type=code&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=openid`

  it('issues a code for an app the user already granted', async () => {
    oauthGrant.findFirst.mockResolvedValue({
      id: 'oag_1',
      scopes: ['openid'],
      revokedAt: null,
    })

    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('authorized')
    expect(response.body.data.redirectTo).toContain(
      `${REDIRECT}?code=876_code_`
    )
    expect(authorizationCode.create).toHaveBeenCalledTimes(1)
  })

  it('stores only the hash of the code, never the code itself', async () => {
    oauthGrant.findFirst.mockResolvedValue({
      id: 'oag_1',
      scopes: ['openid'],
      revokedAt: null,
    })

    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    const code = new URL(response.body.data.redirectTo).searchParams.get(
      'code'
    ) as string
    const data = authorizationCode.create.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.codeHash).toBe(sha256(code))
    expect(Object.values(data)).not.toContain(code)
  })

  it('requires consent when the app has no grant', async () => {
    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('consent_required')
    expect(response.body.data.consentPath).toContain('/oauth/consent?')
    expect(authorizationCode.create).not.toHaveBeenCalled()
  })

  it('skips consent for a first-party app', async () => {
    app.findFirst.mockResolvedValue(appRow({ appKind: 'internal' }))

    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.body.data.status).toBe('authorized')
  })

  it('re-prompts when the grant was revoked', async () => {
    oauthGrant.findFirst.mockResolvedValue({
      id: 'oag_1',
      scopes: ['openid'],
      revokedAt: BigInt(NOW - 10),
    })

    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.body.data.status).toBe('consent_required')
  })

  it('re-prompts when a newly requested scope is not in the grant', async () => {
    oauthGrant.findFirst.mockResolvedValue({
      id: 'oag_1',
      scopes: ['openid'],
      revokedAt: null,
    })

    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}%20profile`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.body.data.status).toBe('consent_required')
  })

  it('errors rather than redirecting when prompt=none needs consent', async () => {
    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}&prompt=none`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('provider/consent-required')
  })

  it('rejects an unregistered redirect URI', async () => {
    const response = await request(createApp())
      .get(
        `/oauth/authorize?response_type=code&client_id=${CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent('https://evil.test/callback')}&scope=openid`
      )
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('provider/invalid-redirect-uri')
  })

  it('rejects a registered redirect URI that is plain http on a public host', async () => {
    // Registration is not enough: the code would travel in clear text.
    const insecure = 'http://app.876.test/callback'
    app.findFirst.mockResolvedValue(appRow({ allowedRedirectUris: [insecure] }))

    const response = await request(createApp())
      .get(
        `/oauth/authorize?response_type=code&client_id=${CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(insecure)}&scope=openid`
      )
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('provider/invalid-redirect-uri')
  })

  it('rejects a scope the app is not allowed to request', async () => {
    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}%20billing.invoices.write`)
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('provider/invalid-scope')
  })

  it('rejects an unsupported response_type', async () => {
    const response = await request(createApp())
      .get(
        `/oauth/authorize?response_type=token&client_id=${CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT)}`
      )
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('provider/unsupported-response-type')
  })

  it('refuses an asserted identity without the internal key', async () => {
    // Without this gate anyone could name a user and be issued their code.
    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set('X-User-Id', USER_ID)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('provider/login-required')
    expect(authorizationCode.create).not.toHaveBeenCalled()
  })

  it('refuses a bearer access token in place of the internal key', async () => {
    // There is deliberately no bearer fallback: it would let a token holder
    // drive consent and self-grant scopes.
    const token = await signProviderJwt({
      sub: USER_ID,
      aud: CLIENT_ID,
      token_use: 'access',
      exp: NOW + 600,
    })

    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('provider/login-required')
  })

  it('refuses an internal key that does not match', async () => {
    const response = await request(createApp())
      .get(`/oauth/authorize?${QUERY}`)
      .set({ 'x-internal-key': 'wrong-key', 'X-User-Id': USER_ID })

    expect(response.status).toBe(401)
  })
})

describe('POST /oauth/token — authorization_code', () => {
  const BODY = {
    grant_type: 'authorization_code',
    code: 'the-code',
    redirect_uri: REDIRECT,
    client_id: CLIENT_ID,
    code_verifier: 'verifier-abc',
  }

  it('exchanges a code for tokens', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(200)
    expect(response.body.data.token_type).toBe('Bearer')
    expect(response.body.data.access_token).toBeTruthy()
    // openid was granted, so an ID token is issued.
    expect(response.body.data.id_token).toBeTruthy()
    // offline_access was not, so no refresh token.
    expect(response.body.data.refresh_token).toBeNull()
    expect(session.create).toHaveBeenCalledTimes(1)
  })

  it('stores only the hash of the access token', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    const data = session.create.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data.tokenHash).toBe(sha256(response.body.data.access_token))
    expect(data.token).toBeNull()
  })

  it('issues a refresh token only when offline_access was granted', async () => {
    authorizationCode.findUnique.mockResolvedValue(
      codeRow({ scope: 'openid offline_access' })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.body.data.refresh_token).toMatch(/^876_rt_/)
    expect(oauthRefreshToken.create).toHaveBeenCalledTimes(1)
  })

  it('rejects a wrong PKCE verifier', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, code_verifier: 'not-the-verifier' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_grant')
    expect(session.create).not.toHaveBeenCalled()
  })

  it('rejects a missing PKCE verifier', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, code_verifier: undefined })

    expect(response.status).toBe(400)
    expect(session.create).not.toHaveBeenCalled()
  })

  it('rejects an already-used code', async () => {
    authorizationCode.findUnique.mockResolvedValue(
      codeRow({ usedAt: BigInt(NOW - 1) })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_grant')
  })

  it('rejects the loser of a concurrent exchange of the same code', async () => {
    // Both requests pass the read; only the guarded update may win.
    authorizationCode.updateMany.mockResolvedValue({ count: 0 })

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_grant')
    expect(session.create).not.toHaveBeenCalled()
  })

  it('consumes the code with a used-at guard', async () => {
    await request(createApp()).post('/oauth/token').type('form').send(BODY)

    expect(authorizationCode.updateMany).toHaveBeenCalledWith({
      where: { id: 'auc_1', usedAt: null },
      data: { usedAt: BigInt(NOW) },
    })
  })

  it('rejects an expired code', async () => {
    authorizationCode.findUnique.mockResolvedValue(
      codeRow({ expiresAt: BigInt(NOW - 1) })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_grant')
  })

  it('rejects a redirect_uri that differs from the one authorized', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, redirect_uri: 'https://app.876.test/other' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_redirect_uri')
  })

  it('rejects a code redeemed by a different client', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, client_id: 'client_someone_else' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_client')
  })

  it('requires the secret for a confidential client', async () => {
    authorizationCode.findUnique.mockResolvedValue(
      codeRow({
        app: appRow({
          clientType: 'confidential',
          clientSecretHash: sha256('the-secret'),
        }),
      })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_client')
  })

  it('accepts the correct secret for a confidential client', async () => {
    authorizationCode.findUnique.mockResolvedValue(
      codeRow({
        app: appRow({
          clientType: 'confidential',
          clientSecretHash: sha256('the-secret'),
        }),
      })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, client_secret: 'the-secret' })

    expect(response.status).toBe(200)
  })

  it('accepts client credentials over HTTP Basic', async () => {
    authorizationCode.findUnique.mockResolvedValue(
      codeRow({
        app: appRow({
          clientType: 'confidential',
          clientSecretHash: sha256('the-secret'),
        }),
      })
    )
    const basic = Buffer.from(`${CLIENT_ID}:the-secret`).toString('base64')

    const response = await request(createApp())
      .post('/oauth/token')
      .set('Authorization', `Basic ${basic}`)
      .type('form')
      .send({ ...BODY, client_id: undefined })

    expect(response.status).toBe(200)
  })

  it('rejects a Basic client_id that disagrees with the body', async () => {
    const basic = Buffer.from(`other_client:secret`).toString('base64')

    const response = await request(createApp())
      .post('/oauth/token')
      .set('Authorization', `Basic ${basic}`)
      .type('form')
      .send(BODY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_client')
  })

  it('rejects a public client that presents a secret', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, client_secret: 'unexpected' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_client')
  })

  it('rejects an unsupported grant type', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, grant_type: 'password' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('unsupported_grant_type')
  })

  it('preserves the RFC error description through the envelope', async () => {
    // The envelope reads the message from the whole body, so
    // `error_description` survives rather than the code being repeated.
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, grant_type: 'password' })

    expect(response.body.error.message).toBe(
      'The OAuth grant type is not supported.'
    )
  })
})

describe('POST /oauth/token — refresh_token', () => {
  const BODY = {
    grant_type: 'refresh_token',
    refresh_token: 'the-refresh-token',
    client_id: CLIENT_ID,
  }

  it('rotates a valid refresh token', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(200)
    expect(response.body.data.refresh_token).toMatch(/^876_rt_/)
    // No new authentication happened, so no new ID token.
    expect(response.body.data.id_token).toBeNull()
  })

  it('marks the presented token used rather than revoked', async () => {
    // Revoking here would trip the expired guard on replay and hide the theft.
    await request(createApp()).post('/oauth/token').type('form').send(BODY)

    expect(oauthRefreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'ort_1', usedAt: null },
      data: { usedAt: BigInt(NOW) },
    })
  })

  it('revokes the whole family when a rotated token is replayed', async () => {
    oauthRefreshToken.findUnique.mockResolvedValue(
      refreshRow({ usedAt: BigInt(NOW - 10) })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_grant')
    expect(oauthRefreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, appId: 'app_4qR8', revokedAt: null },
      data: { revokedAt: BigInt(NOW) },
    })
  })

  it('rejects an expired refresh token', async () => {
    oauthRefreshToken.findUnique.mockResolvedValue(
      refreshRow({ expiresAt: BigInt(NOW - 1) })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_token')
  })

  it('rejects a revoked refresh token', async () => {
    oauthRefreshToken.findUnique.mockResolvedValue(
      refreshRow({ revokedAt: BigInt(NOW - 1) })
    )

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(400)
  })

  it('rejects a refresh token belonging to another client', async () => {
    app.findUnique.mockResolvedValue(appRow({ clientId: 'client_other' }))

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_client')
  })

  it('rejects a missing refresh token', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ grant_type: 'refresh_token', client_id: CLIENT_ID })

    expect(response.status).toBe(400)
  })
})

describe('POST /oauth/token — client_credentials', () => {
  const CONFIDENTIAL = appRow({
    clientType: 'confidential',
    clientSecretHash: sha256('the-secret'),
    scopesAllowed: ['openid', 'offline_access', 'billing.invoices.read'],
  })

  const BODY = {
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: 'the-secret',
  }

  it('issues a service token with no user, refresh, or ID token', async () => {
    app.findFirst.mockResolvedValue(CONFIDENTIAL)

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(200)
    expect(response.body.data.id_token).toBeNull()
    expect(response.body.data.refresh_token).toBeNull()
    expect(session.create).not.toHaveBeenCalled()
  })

  it('drops the user-centric scopes from the default grant', async () => {
    // openid without a subject is meaningless, and offline_access has nothing
    // to refresh.
    app.findFirst.mockResolvedValue(CONFIDENTIAL)

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.body.data.scope).toBe('billing.invoices.read')
  })

  it('refuses to grant openid even when explicitly requested', async () => {
    app.findFirst.mockResolvedValue(CONFIDENTIAL)

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, scope: 'openid' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('invalid_scope')
  })

  it('refuses a public client', async () => {
    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send(BODY)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('unauthorized_client')
  })

  it('refuses a wrong secret', async () => {
    app.findFirst.mockResolvedValue(CONFIDENTIAL)

    const response = await request(createApp())
      .post('/oauth/token')
      .type('form')
      .send({ ...BODY, client_secret: 'wrong' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_client')
  })
})

describe('GET /oauth/userinfo', () => {
  async function accessToken(claims: Record<string, unknown> = {}) {
    return signProviderJwt({
      sub: USER_ID,
      aud: CLIENT_ID,
      exp: NOW + 600,
      iat: NOW,
      scope: 'openid profile email',
      token_use: 'access',
      ...claims,
    })
  }

  it('releases only the claims the granted scopes allow', async () => {
    session.findUnique.mockResolvedValue({
      id: 'ses_1',
      appId: 'app_4qR8',
      expiresAt: BigInt(NOW + 600),
      user: userRow(),
    })

    const response = await request(createApp())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${await accessToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      sub: USER_ID,
      email: 'alejandra@example.com',
      email_verified: true,
      name: 'Alejandra Reyes',
      given_name: 'Alejandra',
      family_name: 'Reyes',
    })
  })

  it('withholds email when the scope was not granted', async () => {
    session.findUnique.mockResolvedValue({
      id: 'ses_1',
      appId: 'app_4qR8',
      expiresAt: BigInt(NOW + 600),
      user: userRow(),
    })

    const response = await request(createApp())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${await accessToken({ scope: 'openid' })}`)

    expect(response.body.data).toEqual({ sub: USER_ID })
  })

  it('rejects an ID token presented as an access token', async () => {
    const response = await request(createApp())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${await accessToken({ token_use: 'id' })}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_token')
  })

  it('rejects a service token presented as an access token', async () => {
    const response = await request(createApp())
      .get('/oauth/userinfo')
      .set(
        'Authorization',
        `Bearer ${await accessToken({ token_use: 'service' })}`
      )

    expect(response.status).toBe(401)
  })

  it('rejects a validly signed token whose session is gone', async () => {
    // Revocation must take effect before the token's own expiry.
    session.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${await accessToken()}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_token')
  })

  it('rejects an expired session', async () => {
    session.findUnique.mockResolvedValue({
      id: 'ses_1',
      appId: 'app_4qR8',
      expiresAt: BigInt(NOW - 1),
      user: userRow(),
    })

    const response = await request(createApp())
      .get('/oauth/userinfo')
      .set('Authorization', `Bearer ${await accessToken()}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('invalid_token')
  })

  it('rejects a garbage token', async () => {
    const response = await request(createApp())
      .get('/oauth/userinfo')
      .set('Authorization', 'Bearer not-a-jwt')

    expect(response.status).toBe(401)
  })

  it('rejects a request with no bearer token', async () => {
    const response = await request(createApp()).get('/oauth/userinfo')

    expect(response.status).toBe(401)
  })
})

describe('POST /oauth/revoke and /oauth/introspect', () => {
  const API_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'

  it('revokes the session behind a token', async () => {
    const response = await request(createApp())
      .post('/oauth/revoke')
      .set('Authorization', `Bearer ${API_KEY}`)
      .type('form')
      .send({ token: 'some-token' })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ revoked: true })
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: sha256('some-token') },
    })
  })

  it('refuses to revoke without an API key', async () => {
    const response = await request(createApp())
      .post('/oauth/revoke')
      .type('form')
      .send({ token: 'some-token' })

    expect(response.status).toBe(401)
    expect(session.deleteMany).not.toHaveBeenCalled()
  })

  it('refuses a revoked API key', async () => {
    apiKey.findUnique.mockResolvedValue({
      id: 'key_1',
      appId: 'app_4qR8',
      revoked: true,
      expiresAt: null,
    })

    const response = await request(createApp())
      .post('/oauth/revoke')
      .set('Authorization', `Bearer ${API_KEY}`)
      .type('form')
      .send({ token: 'some-token' })

    expect(response.status).toBe(401)
  })

  it('reports an active token', async () => {
    const token = await signProviderJwt({
      sub: USER_ID,
      aud: CLIENT_ID,
      exp: NOW + 600,
      iat: NOW,
      scope: 'openid',
      token_use: 'access',
    })
    session.findUnique.mockResolvedValue({
      id: 'ses_1',
      appId: 'app_4qR8',
      expiresAt: BigInt(NOW + 600),
      user: userRow(),
    })

    const response = await request(createApp())
      .post('/oauth/introspect')
      .set('Authorization', `Bearer ${API_KEY}`)
      .type('form')
      .send({ token })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      active: true,
      scope: 'openid',
      sub: USER_ID,
      token_type: 'Bearer',
    })
  })

  it('reports inactive for a token with no session, without leaking why', async () => {
    const token = await signProviderJwt({
      sub: USER_ID,
      aud: CLIENT_ID,
      exp: NOW + 600,
      token_use: 'access',
    })
    session.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/oauth/introspect')
      .set('Authorization', `Bearer ${API_KEY}`)
      .type('form')
      .send({ token })

    expect(response.body.data).toEqual({ active: false })
  })

  it('refuses to introspect without an API key', async () => {
    const response = await request(createApp())
      .post('/oauth/introspect')
      .type('form')
      .send({ token: 'x' })

    expect(response.status).toBe(401)
  })
})

describe('GET /oauth/end-session', () => {
  it('deletes the session named by the id_token_hint', async () => {
    const idToken = await signProviderJwt({
      sub: USER_ID,
      aud: CLIENT_ID,
      sid: 'ses_1',
      exp: NOW + 600,
      token_use: 'id',
    })

    const response = await request(createApp()).get(
      `/oauth/end-session?id_token_hint=${idToken}`
    )

    expect(response.status).toBe(302)
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { id: 'ses_1', userId: USER_ID },
    })
  })

  it('redirects to a registered post-logout URI, carrying state', async () => {
    const response = await request(createApp()).get(
      '/oauth/end-session?client_id=' +
        CLIENT_ID +
        '&post_logout_redirect_uri=' +
        encodeURIComponent('https://app.876.test/goodbye') +
        '&state=xyz'
    )

    expect(response.status).toBe(302)
    expect(response.headers.location).toBe(
      'https://app.876.test/goodbye?state=xyz'
    )
  })

  it('ignores an unregistered post-logout URI rather than redirecting to it', async () => {
    // This endpoint needs no credential, so an unchecked target is an open
    // redirect anyone could use.
    const response = await request(createApp()).get(
      '/oauth/end-session?client_id=' +
        CLIENT_ID +
        '&post_logout_redirect_uri=' +
        encodeURIComponent('https://evil.test/steal')
    )

    expect(response.status).toBe(302)
    expect(response.headers.location).not.toContain('evil.test')
  })

  it('does not delete a session for an access token presented as the hint', async () => {
    const accessToken = await signProviderJwt({
      sub: USER_ID,
      sid: 'ses_1',
      exp: NOW + 600,
      token_use: 'access',
    })

    await request(createApp()).get(
      `/oauth/end-session?id_token_hint=${accessToken}`
    )

    expect(session.deleteMany).not.toHaveBeenCalled()
  })
})

describe('consent', () => {
  const BODY = {
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    scope: 'openid profile',
  }

  it('returns what the consent screen needs', async () => {
    const response = await request(createApp())
      .get(
        `/oauth/consent?response_type=code&client_id=${CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=openid`
      )
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })

    expect(response.status).toBe(200)
    expect(response.body.data.app.clientId).toBe(CLIENT_ID)
    expect(response.body.data.user.name).toBe('Alejandra Reyes')
    expect(response.body.data.scopes).toEqual(['openid'])
  })

  it('records the grant and issues a code on approval', async () => {
    const response = await request(createApp())
      .post('/oauth/consent/approve')
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })
      .send(BODY)

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('authorized')
    expect(oauthGrant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scopes: ['openid', 'profile'] }),
      })
    )
    expect(authorizationCode.create).toHaveBeenCalledTimes(1)
  })

  it('un-revokes an existing grant on re-approval', async () => {
    oauthGrant.findFirst.mockResolvedValue({
      id: 'oag_1',
      scopes: ['openid'],
      revokedAt: BigInt(NOW - 10),
    })

    await request(createApp())
      .post('/oauth/consent/approve')
      .set({ ...INTERNAL, 'X-User-Id': USER_ID })
      .send(BODY)

    expect(oauthGrant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedAt: null }),
      })
    )
  })

  it('refuses approval without the internal key', async () => {
    // The whole point of the gate: an access-token holder must not be able to
    // self-grant scopes without the user seeing the screen.
    const response = await request(createApp())
      .post('/oauth/consent/approve')
      .set('X-User-Id', USER_ID)
      .send(BODY)

    expect(response.status).toBe(401)
    expect(oauthGrant.create).not.toHaveBeenCalled()
    expect(authorizationCode.create).not.toHaveBeenCalled()
  })

  it('redirects with access_denied on denial', async () => {
    const response = await request(createApp())
      .post('/oauth/consent/deny')
      .send({ ...BODY, state: 'xyz' })

    expect(response.status).toBe(200)
    const url = new URL(response.body.data.redirectTo)
    expect(url.searchParams.get('error')).toBe('access_denied')
    expect(url.searchParams.get('state')).toBe('xyz')
    expect(authorizationCode.create).not.toHaveBeenCalled()
  })

  it('still validates the redirect URI on denial', async () => {
    const response = await request(createApp())
      .post('/oauth/consent/deny')
      .send({ ...BODY, redirect_uri: 'https://evil.test/callback' })

    expect(response.status).toBe(400)
  })
})
