import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyProviderJwt } from '@/platform/jwt'
import { unsealSession } from '@/platform/session'

/**
 * The credential a signed-in session carries.
 *
 * Every 876 app reads the sealed cookie and forwards the token inside it as
 * `Authorization: Bearer` to the services it calls. That token used to be the
 * identity provider's own access token, which no 876 service can verify — and
 * the session row's `token_hash` was the hash of a random token that was
 * generated and immediately thrown away. So `/oauth/introspect` had nothing to
 * match and every delegated call across the platform failed as
 * `auth/invalid-token`. These tests pin both halves of the fix: the token is
 * ours, and its hash is the one on the row.
 */

const NOW = 1_785_000_000
const PROVIDER_TOKEN = 'workos_access_token_that_876_cannot_verify'

const { createSessionRow, ensureFromWorkos } = vi.hoisted(() => ({
  createSessionRow: vi.fn(),
  ensureFromWorkos: vi.fn(),
}))

vi.mock('@/modules/auth/auth.repository', () => ({
  createSessionRow,
  ensureFromWorkos,
  upsertEnrollment: vi.fn().mockResolvedValue(undefined),
  findOrganizationByWorkosId: vi.fn().mockResolvedValue(null),
  ensureOrgMembership: vi.fn().mockResolvedValue(undefined),
}))

// Nothing here touches the database, but importing the service reaches the
// client module, which dials on construction.
vi.mock('@/db/client', () => ({
  prisma: {},
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/platform/timestamps', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/platform/timestamps')>()),
  nowUnixSeconds: () => NOW,
}))

vi.mock('@/services/auth-telemetry', () => ({
  AuthTelemetryService: class {
    record() {
      return Promise.resolve({ deviceId: null, context: null })
    }
  },
  decodeDeviceSignal: vi.fn(),
}))

const service = await import('@/modules/auth/auth.service')
const { SESSION_TTL_SECONDS } = service

function userRow() {
  return {
    id: 'user_2kL9',
    email: 'alejandra@example.com',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    emailVerified: true,
    avatar: null,
    username: 'alejandra',
    banned: false,
  }
}

/** Signs in, returning the cookie payload and the session row that was written. */
async function signIn() {
  const cookies: Record<string, string> = {}
  const res = {
    cookie: (name: string, value: string) => {
      cookies[name] = value
    },
  }

  await service.completeAuth({
    req: { headers: {} },
    res,
    result: {
      status: 'ok',
      session: {
        // The provider's token — deliberately not a JWT this service could
        // sign, so a test fails loudly if it ever reaches the cookie again.
        accessToken: PROVIDER_TOKEN,
        user: userRow(),
        organizationId: null,
      },
    } as never,
    event: 'login',
    appId: 'app_4qR8',
  })

  const sealed = cookies[service.getSessionCookieName()]
  if (!sealed) throw new Error('no session cookie was set')

  const row = createSessionRow.mock.calls[0]?.[0] as
    { tokenHash: string; expiresAt: bigint } | undefined
  if (!row) throw new Error('no session row was written')

  return {
    payload: unsealSession(sealed, service.requireCookieSecret()) as {
      accessToken: string | null
      sid?: string
    },
    row,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ensureFromWorkos.mockResolvedValue(userRow())
  createSessionRow.mockResolvedValue({})
})

describe('the session cookie token', () => {
  it('seals a token this service can verify, not the provider’s', async () => {
    const { payload } = await signIn()

    expect(payload.accessToken).toBeTypeOf('string')
    expect(payload.accessToken).not.toBe(PROVIDER_TOKEN)
    await expect(
      verifyProviderJwt(payload.accessToken as string)
    ).resolves.not.toBeNull()
  })

  it('mints it as an access token for the signed-in user', async () => {
    const { payload } = await signIn()

    const claims = await verifyProviderJwt(payload.accessToken as string)
    expect(claims).toMatchObject({
      sub: 'user_2kL9',
      token_use: 'access',
      scope: 'openid profile email',
      realm: 'consumer',
      iat: NOW,
      exp: NOW + SESSION_TTL_SECONDS,
    })
  })

  it('binds the token to the session row by hash', async () => {
    // The whole point: `/oauth/introspect` resolves a presented token to a
    // session through this hash. A row hashing anything else is unmatchable.
    const { payload, row } = await signIn()

    expect(row.tokenHash).toBe(
      createHash('sha256')
        .update(payload.accessToken as string, 'utf8')
        .digest('hex')
    )
  })

  it('names the session row it belongs to', async () => {
    const { payload } = await signIn()

    const claims = await verifyProviderJwt(payload.accessToken as string)
    expect(claims?.sid).toBe(payload.sid)
  })

  it('expires with the session row, never after it', async () => {
    const { payload, row } = await signIn()

    const claims = await verifyProviderJwt(payload.accessToken as string)
    expect(claims?.exp).toBe(Number(row.expiresAt))
  })

  it('carries no audience, so the acting app stays the presented API key', async () => {
    const { payload } = await signIn()

    const claims = await verifyProviderJwt(payload.accessToken as string)
    expect(claims?.aud).toBeUndefined()
  })
})
