import { createHash } from 'node:crypto'
import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { repository } = vi.hoisted(() => ({
  repository: {
    retrieveClient: vi.fn(),
    markClientUsed: vi.fn(),
  },
}))

vi.mock('../integration.repository.js', () => repository)

const guard = await import('../integration.guard.js')

function clientRow(overrides = {}) {
  const secret = 'test-secret-value'
  return {
    id: 'intc_abc123',
    tenantId: 'prjten_1',
    organizationId: 'org_1',
    name: 'CI sync',
    scopes: ['projects:read'],
    secretHash: createHash('sha256').update(secret, 'utf8').digest('hex'),
    keyPrefix: 'test-sec',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

function buildApp(scope?: string) {
  const app = express()
  app.get(
    '/guarded',
    guard.requireIntegrationClient,
    ...(scope ? [guard.requireIntegrationScope(scope as never)] : []),
    (_req, res) => {
      res.json({ data: { ok: true }, error: null })
    }
  )
  app.use(errorHandler)
  return app
}

async function get(
  app: express.Express,
  headers: Record<string, string> = {}
) {
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/guarded`, {
      headers,
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

const BEARER = 'Bearer intc_abc123.test-secret-value'

beforeEach(() => {
  vi.clearAllMocks()
  guard.resetIntegrationRateLimits()
  repository.retrieveClient.mockResolvedValue(clientRow())
})

describe('parseIntegrationAuthorization', () => {
  it('parses client id and secret', () => {
    expect(guard.parseIntegrationAuthorization(BEARER)).toEqual({
      clientId: 'intc_abc123',
      secret: 'test-secret-value',
    })
  })

  it('rejects missing and malformed headers', () => {
    expect(guard.parseIntegrationAuthorization(undefined)).toBeNull()
    expect(guard.parseIntegrationAuthorization('Basic abc')).toBeNull()
    expect(guard.parseIntegrationAuthorization('Bearer no-dot')).toBeNull()
    expect(guard.parseIntegrationAuthorization('Bearer .secret')).toBeNull()
    expect(guard.parseIntegrationAuthorization('Bearer intc_1.')).toBeNull()
  })

  it('rejects non-integration client ids', () => {
    expect(
      guard.parseIntegrationAuthorization('Bearer other_1.secret')
    ).toBeNull()
  })
})

describe('integrationSecretMatches', () => {
  it('matches the stored hash', () => {
    const row = clientRow()
    expect(
      guard.integrationSecretMatches('test-secret-value', row.secretHash)
    ).toBe(true)
  })

  it('rejects wrong secrets and empty inputs', () => {
    const row = clientRow()
    expect(guard.integrationSecretMatches('wrong', row.secretHash)).toBe(false)
    expect(guard.integrationSecretMatches('', row.secretHash)).toBe(false)
    expect(guard.integrationSecretMatches('test-secret-value', '')).toBe(false)
  })
})

describe('checkIntegrationRateLimit', () => {
  it('allows requests under the limit', () => {
    for (let index = 0; index < 10; index += 1)
      expect(guard.checkIntegrationRateLimit('intc_rate', 1000)).toBe(true)
  })

  it('blocks past six hundred requests per minute', () => {
    let allowed = 0
    for (let index = 0; index < 601; index += 1)
      if (guard.checkIntegrationRateLimit('intc_capped', 1000)) allowed += 1
    expect(allowed).toBe(600)
  })

  it('resets after the window', () => {
    for (let index = 0; index < 600; index += 1)
      guard.checkIntegrationRateLimit('intc_window', 1000)
    expect(guard.checkIntegrationRateLimit('intc_window', 1000)).toBe(false)
    expect(guard.checkIntegrationRateLimit('intc_window', 61_001)).toBe(true)
  })
})

describe('requireIntegrationClient', () => {
  it('returns 401 without credentials', async () => {
    const response = await get(buildApp())
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('projects/unauthorized')
  })

  it('returns 401 for unknown clients', async () => {
    repository.retrieveClient.mockResolvedValueOnce(null)
    const response = await get(buildApp(), { authorization: BEARER })
    expect(response.status).toBe(401)
  })

  it('returns 401 for revoked clients', async () => {
    repository.retrieveClient.mockResolvedValueOnce(
      clientRow({ revokedAt: 1000n })
    )
    const response = await get(buildApp(), { authorization: BEARER })
    expect(response.status).toBe(401)
  })

  it('returns 401 for wrong secrets', async () => {
    const response = await get(buildApp(), {
      authorization: 'Bearer intc_abc123.wrong-secret',
    })
    expect(response.status).toBe(401)
  })

  it('authenticates and marks the client used', async () => {
    const response = await get(buildApp(), { authorization: BEARER })
    expect(response.status).toBe(200)
    expect(repository.markClientUsed).toHaveBeenCalledWith(
      'intc_abc123',
      expect.any(BigInt)
    )
  })

  it('returns 429 when rate limited', async () => {
    for (let index = 0; index < 600; index += 1)
      guard.checkIntegrationRateLimit('intc_abc123', Date.now())
    const response = await get(buildApp(), { authorization: BEARER })
    expect(response.status).toBe(429)
    expect(response.body.error.code).toBe('projects/rate-limited')
  })
})

describe('requireIntegrationScope', () => {
  it('returns 401 without a client context', async () => {
    const response = await get(buildApp('projects:read'))
    expect(response.status).toBe(401)
  })

  it('returns 403 when the scope is missing', async () => {
    const response = await get(buildApp('projects:write'), {
      authorization: BEARER,
    })
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('projects/forbidden')
  })

  it('passes when the scope is granted', async () => {
    const response = await get(buildApp('projects:read'), {
      authorization: BEARER,
    })
    expect(response.status).toBe(200)
  })
})
