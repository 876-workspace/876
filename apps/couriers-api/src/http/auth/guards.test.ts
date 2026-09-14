import express, { type Express, type Request, type Response } from 'express'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'
import { createApiRouter } from '@/http/api-router'
import { createAuthGuards } from '@/http/auth'
import { errorHandler, notFoundHandler } from '@/http/middleware/error-handler'
import { envelope } from '@/http/middleware/envelope'
import { requestContext } from '@/http/middleware/request-context'
import { createGuardResolver } from '@/http/routes'
import { resetProviderJwtKeyCache } from '@/platform/jwt'

const ISSUER = 'https://identity.example.test'
const AUDIENCE = 'client_couriers'
const JWKS_URL = `${ISSUER}/oauth/.well-known/jwks.json`
const APP_KEY = '876_app_secret_test_key_for_couriers_api'

const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  API_876_KEY: APP_KEY,
  API_INTERNAL_KEY: 'test-internal-key',
  API_URL: ISSUER,
  OAUTH_ISSUER: ISSUER,
  OAUTH_AUDIENCE: AUDIENCE,
  OAUTH_JWKS_URL: JWKS_URL,
  SENTRY_DSN: '',
}

const { handler, findApiKeyByHash, markApiKeyUsed, prisma } = vi.hoisted(
  () => ({
    handler: vi.fn(),
    findApiKeyByHash: vi.fn(),
    markApiKeyUsed: vi.fn(),
    prisma: { tenant: {} },
  })
)

vi.mock('@/db/client', () => ({
  prisma,
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

function createSessionApp(): Express {
  const app = express()
  const guards = createAuthGuards({
    findApiKeyByHash,
    markApiKeyUsed,
  })
  const api = createApiRouter({
    tag: 'Session guard test',
    prefix: '/session-probe',
    resolveGuards: createGuardResolver(guards),
  })

  api.get({
    path: '',
    security: 'session',
    summary: 'Session guard test route',
    responses: { 200: { description: 'Session was accepted.' } },
    handler: (_req: Request, res: Response) => {
      handler()
      res.status(200).json({ object: 'session-probe' })
    },
  })

  app.use(requestContext)
  app.use(envelope)
  app.use(api.router)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

async function createToken(
  privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'],
  overrides: {
    audience?: string
    expiresAt?: number
    issuer?: string
    tokenUse?: 'access' | 'id' | 'service'
  } = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({ token_use: overrides.tokenUse ?? 'access' })
    .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
    .setIssuer(overrides.issuer ?? ISSUER)
    .setSubject('user_123')
    .setAudience(overrides.audience ?? AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(overrides.expiresAt ?? now + 300)
    .sign(privateKey)
}

async function createSessionToken(
  privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'],
  claims: Record<string, unknown> = { sid: 'ses_123' }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({ token_use: 'access', realm: 'enterprise', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
    .setSubject('user_123')
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey)
}

function mockJwks(
  jwk: Record<string, unknown>,
  introspection: Record<string, unknown> = { active: true, sub: 'user_123' }
) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url.endsWith('/oauth/introspect'))
      return new Response(JSON.stringify({ data: introspection, error: null }))
    return new Response(
      JSON.stringify({
        keys: [{ ...jwk, alg: 'RS256', kid: 'platform-key-1', use: 'sig' }],
      })
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sessionRequest(app: Express, token: string) {
  return request(app)
    .get('/session-probe')
    .set('X-876-API-Key', APP_KEY)
    .set('Authorization', `Bearer ${token}`)
}

function expectInvalidToken(response: request.Response) {
  expect(response.status).toBe(401)
  expect(response.body).toEqual({
    data: null,
    error: {
      code: 'auth/invalid-token',
      message: 'The Bearer [REDACTED] is invalid or expired.',
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetProviderJwtKeyCache()
  resetSettingsForTest(testEnv)
  findApiKeyByHash.mockResolvedValue({
    id: 'key_123',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  markApiKeyUsed.mockResolvedValue(undefined)
})

afterEach(() => {
  resetProviderJwtKeyCache()
  resetSettingsForTest(testEnv)
  vi.unstubAllGlobals()
})

describe('session-tier authentication', () => {
  it('accepts a valid RS256 access token issued for this service', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const token = await createToken(privateKey)
    const fetchMock = mockJwks(await exportJWK(publicKey))

    const response = await sessionRequest(createSessionApp(), token)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'session-probe' },
      error: null,
    })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(findApiKeyByHash).toHaveBeenCalledTimes(1)
    expect(markApiKeyUsed).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects a token signed by an unknown key before the handler runs', async () => {
    const trusted = await generateKeyPair('RS256')
    const untrusted = await generateKeyPair('RS256')
    const token = await createToken(untrusted.privateKey)
    const fetchMock = mockJwks(await exportJWK(trusted.publicKey))

    const response = await sessionRequest(createSessionApp(), token)

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects an expired token before the handler runs', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const token = await createToken(privateKey, {
      expiresAt: Math.floor(Date.now() / 1000) - 60,
    })
    const fetchMock = mockJwks(await exportJWK(publicKey))

    const response = await sessionRequest(createSessionApp(), token)

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a token from the wrong issuer before the handler runs', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const token = await createToken(privateKey, {
      issuer: 'https://other-identity.example.test',
    })
    const fetchMock = mockJwks(await exportJWK(publicKey))

    const response = await sessionRequest(createSessionApp(), token)

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a token for a different audience before the handler runs', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const token = await createToken(privateKey, { audience: 'client_other' })
    const fetchMock = mockJwks(await exportJWK(publicKey))

    const response = await sessionRequest(createSessionApp(), token)

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a non-access token before the handler runs', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const token = await createToken(privateKey, { tokenUse: 'id' })
    const fetchMock = mockJwks(await exportJWK(publicKey))

    const response = await sessionRequest(createSessionApp(), token)

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a malformed token before the handler runs', async () => {
    const fetchMock = mockJwks({})

    const response = await sessionRequest(createSessionApp(), 'not-a-jwt')

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(0)
  })

  it('rejects a session request when verification is not configured', async () => {
    resetSettingsForTest({
      ...testEnv,
      API_URL: '',
      OAUTH_AUDIENCE: '',
      OAUTH_ISSUER: '',
      OAUTH_JWKS_URL: '',
    })
    const fetchMock = mockJwks({})

    const response = await sessionRequest(createSessionApp(), 'not-a-jwt')

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(0)
  })

  it('does not treat an internal admin credential as an end-user session', async () => {
    const response = await request(createSessionApp())
      .get('/session-probe')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', 'test-internal-key')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'auth/no-session',
        message: 'You are not signed in. Please sign in to continue.',
      },
    })
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects a session request when the JWKS cannot be fetched', async () => {
    const { privateKey } = await generateKeyPair('RS256')
    const token = await createToken(privateKey)
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    const response = await sessionRequest(createSessionApp(), token)

    expectInvalidToken(response)
    expect(handler).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  describe('first-party session tokens', () => {
    it('accepts an audience-less session token the identity API confirms is live', async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const token = await createSessionToken(privateKey)
      const fetchMock = mockJwks(await exportJWK(publicKey))

      const response = await sessionRequest(createSessionApp(), token)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        data: { object: 'session-probe' },
        error: null,
      })
      expect(handler).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const [url, init] = fetchMock.mock.calls[1] as unknown as [
        string,
        RequestInit,
      ]
      expect(url).toBe(`${ISSUER}/oauth/introspect`)
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({
        authorization: `Bearer ${APP_KEY}`,
        'content-type': 'application/x-www-form-urlencoded',
      })
      expect(String(init.body)).toBe(new URLSearchParams({ token }).toString())
    })

    it('answers 503 when the identity API returns an error envelope', async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const token = await createSessionToken(privateKey)
      const jwk = await exportJWK(publicKey)
      const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input)
        if (url.endsWith('/oauth/introspect'))
          return new Response(
            JSON.stringify({
              data: null,
              error: { code: 'internal', message: 'Internal error.' },
            })
          )
        return new Response(
          JSON.stringify({
            keys: [{ ...jwk, alg: 'RS256', kid: 'platform-key-1', use: 'sig' }],
          })
        )
      })
      vi.stubGlobal('fetch', fetchMock)

      const response = await sessionRequest(createSessionApp(), token)

      expect(response.status).toBe(503)
      expect(response.body.error.code).toBe('auth/identity-unavailable')
      expect(handler).not.toHaveBeenCalled()
    })

    it('rejects a session token whose session has been signed out', async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const token = await createSessionToken(privateKey)
      const fetchMock = mockJwks(await exportJWK(publicKey), { active: false })

      const response = await sessionRequest(createSessionApp(), token)

      expectInvalidToken(response)
      expect(handler).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('rejects a live session that introspects to a different subject', async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const token = await createSessionToken(privateKey)
      const fetchMock = mockJwks(await exportJWK(publicKey), {
        active: true,
        sub: 'user_other',
      })

      const response = await sessionRequest(createSessionApp(), token)

      expectInvalidToken(response)
      expect(handler).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('rejects an audience-less token that names no session without introspecting', async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const token = await createSessionToken(privateKey, {})
      const fetchMock = mockJwks(await exportJWK(publicKey))

      const response = await sessionRequest(createSessionApp(), token)

      expectInvalidToken(response)
      expect(handler).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('answers 503 when the identity API cannot confirm the session', async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const token = await createSessionToken(privateKey)
      const jwk = await exportJWK(publicKey)
      const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input)
        if (url.endsWith('/oauth/introspect'))
          throw new Error('network unavailable')
        return new Response(
          JSON.stringify({
            keys: [{ ...jwk, alg: 'RS256', kid: 'platform-key-1', use: 'sig' }],
          })
        )
      })
      vi.stubGlobal('fetch', fetchMock)

      const response = await sessionRequest(createSessionApp(), token)

      expect(response.status).toBe(503)
      expect(response.body).toEqual({
        data: null,
        error: {
          code: 'auth/identity-unavailable',
          message: 'Sign-in could not be verified right now. Please try again.',
        },
      })
      expect(handler).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('reuses a confirmed introspection for repeat requests inside the cache window', async () => {
      const { privateKey, publicKey } = await generateKeyPair('RS256')
      const token = await createSessionToken(privateKey)
      const fetchMock = mockJwks(await exportJWK(publicKey))
      const app = createSessionApp()
      await sessionRequest(app, token)

      const response = await sessionRequest(app, token)

      expect(response.status).toBe(200)
      expect(handler).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
