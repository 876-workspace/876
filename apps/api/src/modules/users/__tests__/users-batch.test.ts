import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signProviderJwt } from '@/platform/jwt'

const { user, userAppEnrollment, membership, apiKey } = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
  userAppEnrollment: { findMany: vi.fn() },
  membership: { findMany: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { user, userAppEnrollment, membership, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const USER_A = 'user_aaa'
const USER_B = 'user_bbb'

async function bearerFor(userId: string): Promise<string> {
  return signProviderJwt({
    sub: userId,
    aud: 'client_876app',
    token_use: 'access',
    realm: 'consumer',
    exp: Math.floor(Date.now() / 1000) + 600,
  })
}

async function authHeaders(userId: string) {
  const token = await bearerFor(userId)
  return {
    'X-876-API-Key': APP_KEY,
    Authorization: `Bearer ${token}`,
  }
}

// The /users list is admin-tier (internal key), which is how Console's admin
// client reaches it. Session bearer alone gets 403 there.
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function enrollmentRow(
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `enr_${userId}`,
    userId,
    appId: 'app_couriers',
    enrolledAt: 1_785_000_000n,
    lastSeenAt: 1_785_000_100n,
    app: {
      id: 'app_couriers',
      name: '876 Couriers',
      slug: '876-couriers',
      logoUrl: null,
      logoFileId: null,
      homepageUrl: null,
      appKind: 'internal',
      status: 'active',
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  userAppEnrollment.findMany.mockResolvedValue([])
  user.findMany.mockResolvedValue([])
  membership.findMany.mockResolvedValue([])
})

describe('GET /users/apps (batch apps by users)', () => {
  it('groups enrollments by user and returns an empty list for a user with none', async () => {
    // USER_A has one enrollment; USER_B has none. Both must appear in the result.
    userAppEnrollment.findMany.mockResolvedValue([enrollmentRow(USER_A)])

    const app = createApp()
    const response = await request(app)
      .get(`/users/apps?user_ids=${USER_A},${USER_B}`)
      .set(await authHeaders(USER_A))

    expect(response.status).toBe(200)
    expect(userAppEnrollment.findMany).toHaveBeenCalledTimes(1)
    expect(userAppEnrollment.findMany).toHaveBeenCalledWith({
      where: { userId: { in: [USER_A, USER_B] } },
      include: { app: true },
      orderBy: { enrolledAt: 'asc' },
    })
    expect(response.body.error).toBeNull()
    expect(response.body.data).toEqual({
      object: 'list',
      data: [
        {
          object: 'user_apps',
          user_id: USER_A,
          data: [
            {
              object: 'app',
              id: 'app_couriers',
              name: '876 Couriers',
              slug: '876-couriers',
              logo_url: null,
              logo_file_id: null,
              homepage_url: null,
              app_kind: 'internal',
              status: 'active',
              enrolled_at: 1_785_000_000,
              last_seen_at: 1_785_000_100,
            },
          ],
        },
        { object: 'user_apps', user_id: USER_B, data: [] },
      ],
      has_more: false,
      url: '/users/apps',
      total_count: 2,
    })
  })

  it('returns 422 when user_ids is missing (schema validation)', async () => {
    const app = createApp()
    const response = await request(app)
      .get('/users/apps')
      .set(await authHeaders(USER_A))

    expect(response.status).toBe(422)
    expect(response.body.data).toBeNull()
    expect(response.body.error.code).toBeDefined()
    expect(userAppEnrollment.findMany).not.toHaveBeenCalled()
  })

  it('returns 400 when more than 100 user_ids are requested', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `user_${i}`).join(',')

    const app = createApp()
    const response = await request(app)
      .get(`/users/apps?user_ids=${ids}`)
      .set(await authHeaders(USER_A))

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBeDefined()
    expect(userAppEnrollment.findMany).not.toHaveBeenCalled()
  })

  it('returns 401 without a session (API key alone is not enough)', async () => {
    const app = createApp()
    const response = await request(app)
      .get(`/users/apps?user_ids=${USER_A}`)
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
    expect(userAppEnrollment.findMany).not.toHaveBeenCalled()
  })
})

describe('GET /users?ids= (batch users by id)', () => {
  it('threads ids into the user query as an IN filter', async () => {
    const app = createApp()
    const response = await request(app)
      .get(`/users?ids=${USER_A},${USER_B}&limit=100`)
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(user.findMany).toHaveBeenCalledTimes(1)
    const firstCall = user.findMany.mock.calls[0]
    if (!firstCall) throw new Error('Expected user.findMany to be called once.')
    const whereArg = firstCall[0].where as {
      id?: { in?: string[] }
    }
    expect(whereArg.id).toEqual({ in: [USER_A, USER_B] })
  })
})
