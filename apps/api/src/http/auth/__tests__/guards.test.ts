import express, { type Express } from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSettings } from '@/config'
import { errorHandler } from '@/http/middleware/error-handler'
import { envelope } from '@/http/middleware/envelope'
import { requestContext } from '@/http/middleware/request-context'
import { signProviderJwt } from '@/platform/jwt'

import { createAuthGuards, type AuthDependencies } from '../guards'
import { hashApiKey } from '../credentials'
import { getPrincipal, type ApiKeyRecord } from '../principal'

const VALID_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const APP_ID = 'app_2kL9mN4q'
const API_KEY_ID = '876_app_key_7fJ3'

function createApiKey(overrides: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
  return {
    id: API_KEY_ID,
    appId: APP_ID,
    revoked: false,
    expiresAt: null,
    ...overrides,
  }
}

const findApiKeyByHash = vi.fn<AuthDependencies['findApiKeyByHash']>()
const markApiKeyUsed = vi.fn<AuthDependencies['markApiKeyUsed']>()

/**
 * A minimal app carrying the real middleware chain, so a test exercises the
 * guard exactly as a request does — including the error middleware that decides
 * the status code and strips the server-only fields.
 */
function createTestApp(
  mount: (app: Express, guards: ReturnType<typeof createAuthGuards>) => void
): Express {
  const app = express()
  app.use(requestContext)
  app.use(express.json())
  app.use(envelope)

  mount(app, createAuthGuards({ findApiKeyByHash, markApiKeyUsed }))

  app.use(errorHandler)
  return app
}

/** Mounts every guard on its own path so one app covers the whole tier model. */
function createGuardedApp(): Express {
  return createTestApp((app, guards) => {
    app.get('/api-key', guards.requireApiKey, (req, res) => {
      res.json(getPrincipal(req))
    })
    app.get('/session', guards.requireSession, (req, res) => {
      res.json(getPrincipal(req))
    })
    app.get('/admin', guards.requireAdmin, (req, res) => {
      res.json(getPrincipal(req))
    })
    app.get('/consumer', guards.requireConsumerSession, (req, res) => {
      res.json(getPrincipal(req))
    })
    app.get('/enterprise', guards.requireEnterpriseSession, (req, res) => {
      res.json(getPrincipal(req))
    })
  })
}

async function accessToken(
  claims: Record<string, unknown> = {}
): Promise<string> {
  return signProviderJwt({
    sub: 'user_2kL9mN4q',
    aud: 'client_876app',
    token_use: 'access',
    realm: 'consumer',
    exp: Math.floor(Date.now() / 1000) + 300,
    ...claims,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  findApiKeyByHash.mockResolvedValue(createApiKey())
  markApiKeyUsed.mockResolvedValue(undefined)
})

describe('requireApiKey', () => {
  it('accepts a valid key and puts the owning app on the principal', async () => {
    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      userId: null,
      appId: APP_ID,
      apiKeyId: API_KEY_ID,
      internal: false,
      realm: 'consumer',
      orgId: null,
      crossRealm: false,
    })
    expect(response.body.error).toBeNull()
  })

  it('looks the key up by hash, never by plaintext', async () => {
    await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(findApiKeyByHash).toHaveBeenCalledTimes(1)
    expect(findApiKeyByHash).toHaveBeenCalledWith(hashApiKey(VALID_KEY))
    expect(findApiKeyByHash).not.toHaveBeenCalledWith(VALID_KEY)
  })

  it('accepts the key from x-api-key', async () => {
    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-API-Key', VALID_KEY)

    expect(response.status).toBe(200)
  })

  it('accepts an app key presented as a bearer credential', async () => {
    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('Authorization', `Bearer ${VALID_KEY}`)

    expect(response.status).toBe(200)
    expect(findApiKeyByHash).toHaveBeenCalledWith(hashApiKey(VALID_KEY))
  })

  it('rejects a request with no key', async () => {
    const response = await request(createGuardedApp()).get('/api-key')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'api-key/missing', message: 'An API key is required.' },
    })
    expect(findApiKeyByHash).not.toHaveBeenCalled()
  })

  it('rejects a key without the app-secret prefix before touching the database', async () => {
    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', 'sk_live_not_an_876_key')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/invalid')
    expect(findApiKeyByHash).not.toHaveBeenCalled()
  })

  it('rejects an unknown key', async () => {
    findApiKeyByHash.mockResolvedValue(null)

    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual({
      code: 'api-key/invalid',
      message: 'Invalid API key.',
    })
  })

  it('rejects a revoked key', async () => {
    findApiKeyByHash.mockResolvedValue(createApiKey({ revoked: true }))

    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual({
      code: 'api-key/revoked',
      message: 'API key has been revoked.',
    })
    expect(markApiKeyUsed).not.toHaveBeenCalled()
  })

  it('rejects an expired key', async () => {
    findApiKeyByHash.mockResolvedValue(
      createApiKey({ expiresAt: Math.floor(Date.now() / 1000) - 60 })
    )

    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual({
      code: 'api-key/expired',
      message: 'API key has expired.',
    })
    expect(markApiKeyUsed).not.toHaveBeenCalled()
  })

  it('accepts a key whose expiry is still in the future', async () => {
    findApiKeyByHash.mockResolvedValue(
      createApiKey({ expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    )

    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(response.status).toBe(200)
  })

  it('records the key as used', async () => {
    await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(markApiKeyUsed).toHaveBeenCalledTimes(1)
    expect(markApiKeyUsed).toHaveBeenCalledWith(API_KEY_ID, expect.any(Number))
  })

  it('still authorizes when recording last-used fails', async () => {
    markApiKeyUsed.mockRejectedValue(new Error('write timeout'))

    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    // Telemetry must never turn an authorized request into a 500.
    expect(response.status).toBe(200)
  })

  it('never echoes the presented key back to the client', async () => {
    findApiKeyByHash.mockResolvedValue(null)

    const response = await request(createGuardedApp())
      .get('/api-key')
      .set('X-876-API-Key', VALID_KEY)

    expect(JSON.stringify(response.body)).not.toContain(VALID_KEY)
  })
})

describe('requireSession', () => {
  it('accepts a valid access token', async () => {
    const response = await request(createGuardedApp())
      .get('/session')
      .set('Authorization', `Bearer ${await accessToken()}`)

    expect(response.status).toBe(200)
    expect(response.body.data.userId).toBe('user_2kL9mN4q')
    expect(response.body.data.appId).toBe('client_876app')
    expect(response.body.data.internal).toBe(false)
  })

  it('carries the org id from an enterprise token', async () => {
    const token = await accessToken({
      realm: 'enterprise',
      org_id: 'org_4qR8',
    })

    const response = await request(createGuardedApp())
      .get('/session')
      .set('Authorization', `Bearer ${token}`)

    expect(response.body.data.realm).toBe('enterprise')
    expect(response.body.data.orgId).toBe('org_4qR8')
  })

  it('rejects a request with no credentials', async () => {
    const response = await request(createGuardedApp()).get('/session')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'No active session.' },
    })
  })

  it('rejects a token this service did not sign', async () => {
    const response = await request(createGuardedApp())
      .get('/session')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.not-our-signature')

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual({
      code: 'auth/invalid-token',
      message: 'The bearer token is invalid or expired.',
    })
  })

  it('rejects an expired token', async () => {
    const token = await accessToken({
      exp: Math.floor(Date.now() / 1000) - 60,
    })

    const response = await request(createGuardedApp())
      .get('/session')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/invalid-token')
  })

  it('rejects an id token presented as a session', async () => {
    // An id token is for the client to read identity claims. Accepting one
    // would let a token the user never consented to spend stand in for their
    // first-party session.
    const token = await accessToken({ token_use: 'id' })

    const response = await request(createGuardedApp())
      .get('/session')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual({
      code: 'auth/invalid-token',
      message: 'The bearer token cannot be used to authorize this request.',
    })
  })

  it('rejects a client-credentials token presented as a session', async () => {
    const token = await accessToken({ token_use: 'service' })

    const response = await request(createGuardedApp())
      .get('/session')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe(
      'The bearer token cannot be used to authorize this request.'
    )
  })

  it('rejects a token with no subject', async () => {
    const token = await signProviderJwt({
      token_use: 'access',
      exp: Math.floor(Date.now() / 1000) + 300,
    })

    const response = await request(createGuardedApp())
      .get('/session')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/invalid-token')
  })

  it('accepts the internal key', async () => {
    const response = await request(createGuardedApp())
      .get('/session')
      .set('x-internal-key', getSettings().internalKey)

    expect(response.status).toBe(200)
    expect(response.body.data.internal).toBe(true)
  })
})

describe('requireAdmin', () => {
  it('accepts the internal key', async () => {
    const response = await request(createGuardedApp())
      .get('/admin')
      .set('x-internal-key', getSettings().internalKey)

    expect(response.status).toBe(200)
    expect(response.body.data.internal).toBe(true)
  })

  it('rejects a wrong internal key as unauthenticated', async () => {
    const response = await request(createGuardedApp())
      .get('/admin')
      .set('x-internal-key', 'not-the-internal-key')

    expect(response.status).toBe(401)
    expect(response.body.error).toEqual({
      code: 'auth/no-session',
      message: 'No active session.',
    })
  })

  it('forbids a user session — an exposable credential never carries admin scope', async () => {
    const response = await request(createGuardedApp())
      .get('/admin')
      .set('Authorization', `Bearer ${await accessToken()}`)

    expect(response.status).toBe(403)
    expect(response.body.error).toEqual({
      code: 'auth/forbidden',
      message: 'Forbidden.',
    })
  })

  it('forbids an app key — it reaches self-scoped endpoints only', async () => {
    const response = await request(createGuardedApp())
      .get('/admin')
      .set('X-876-API-Key', VALID_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('rejects every caller when no internal key is configured', async () => {
    // An unset secret must never mean "allow": with nothing to prove platform
    // authority against, nothing gets it.
    //
    // The key presented here is the one that *does* work in every other test in
    // this file, so this can only pass because the configured key was emptied —
    // a stub that failed to take effect would answer 200.
    const config = await import('@/config')
    vi.spyOn(config, 'getSettings').mockReturnValue({
      ...getSettings(),
      internalKey: '',
    })

    try {
      const response = await request(createGuardedApp())
        .get('/admin')
        .set('x-internal-key', 'test-internal-key')

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('auth/no-session')
    } finally {
      vi.restoreAllMocks()
    }
  })
})

describe('realm guards', () => {
  it('admits a consumer session to a consumer route', async () => {
    const response = await request(createGuardedApp())
      .get('/consumer')
      .set('Authorization', `Bearer ${await accessToken()}`)

    expect(response.status).toBe(200)
  })

  it('refuses a consumer session on an enterprise route', async () => {
    const response = await request(createGuardedApp())
      .get('/enterprise')
      .set('Authorization', `Bearer ${await accessToken()}`)

    expect(response.status).toBe(403)
    expect(response.body.error).toEqual({
      code: 'auth/wrong-realm',
      message: 'This account cannot access this resource.',
    })
  })

  it('refuses an enterprise session on a consumer route', async () => {
    const token = await accessToken({ realm: 'enterprise' })

    const response = await request(createGuardedApp())
      .get('/consumer')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/wrong-realm')
  })

  it('treats an unrecognized realm claim as consumer', async () => {
    const token = await accessToken({ realm: 'superuser' })

    const response = await request(createGuardedApp())
      .get('/enterprise')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(403)
  })

  it('does not realm-gate the internal key', async () => {
    const response = await request(createGuardedApp())
      .get('/enterprise')
      .set('x-internal-key', getSettings().internalKey)

    expect(response.status).toBe(200)
  })

  it('requires a session before it checks the realm', async () => {
    const response = await request(createGuardedApp()).get('/enterprise')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })
})

describe('error bodies', () => {
  it('never leak the server-only http status', async () => {
    const response = await request(createGuardedApp()).get('/session')

    expect(response.body.error).not.toHaveProperty('httpStatus')
    expect(response.body.error).not.toHaveProperty('status')
  })
})
