import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000
const CLOSED_AT = BigInt(NOW - 60)

const {
  user,
  session,
  apiKey,
  enqueueCustomerEnsureForUser,
  billingCustomerSyncRepository,
} = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  session: { deleteMany: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  enqueueCustomerEnsureForUser: vi.fn(),
  billingCustomerSyncRepository: { enqueue: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { user, session, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/services/billing-customer-sync', () => ({
  enqueueCustomerArchiveForUser: vi.fn(),
  enqueueCustomerEnsureForUser,
}))

vi.mock('@/services/billing-customer-sync.repository', () => ({
  createBillingCustomerSyncRepository: vi.fn(
    () => billingCustomerSyncRepository
  ),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_2kL9',
    workosUserId: 'user_workos_1',
    stripeCustomerId: null,
    email: 'alejandra@example.com',
    username: 'alejandra',
    emailVerified: true,
    firstName: 'Alejandra',
    lastName: 'Reyes',
    middleName: null,
    avatar: null,
    avatarFileId: null,
    platformRole: null,
    status: 'active',
    banned: false,
    bannedReason: null,
    deletedAt: CLOSED_AT,
    deletedBy: 'user_admin',
    deletionReason: 'duplicate',
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW - 60),
    ...overrides,
  }
}

function serializedUser() {
  return {
    object: 'user',
    id: 'user_2kL9',
    company: null,
    company_short_name: null,
    company_logo: null,
    workos_user_id: 'user_workos_1',
    stripe_customer_id: null,
    email: 'alejandra@example.com',
    username: 'alejandra',
    email_verified: true,
    first_name: 'Alejandra',
    last_name: 'Reyes',
    middle_name: null,
    avatar: null,
    avatar_file_id: null,
    platform_role: null,
    status: 'active',
    banned: false,
    banned_reason: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: NOW - 100,
    updated_at: NOW,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))

  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  user.findUnique.mockResolvedValue(userRow())
  user.update.mockResolvedValue(
    userRow({
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      updatedAt: BigInt(NOW),
    })
  )
  enqueueCustomerEnsureForUser.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('POST /users/:userId/restore', () => {
  it('clears the tombstone and ensures an active Billing customer without restoring sessions', async () => {
    const response = await request(createApp())
      .post('/users/user_2kL9/restore')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(),
      error: null,
    })
    expect(user.findUnique).toHaveBeenCalledTimes(1)
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_2kL9' },
      select: expect.any(Object),
    })
    expect(user.update).toHaveBeenCalledTimes(1)
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user_2kL9' },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: BigInt(NOW),
      },
      select: expect.any(Object),
    })
    expect(enqueueCustomerEnsureForUser).toHaveBeenCalledTimes(1)
    expect(enqueueCustomerEnsureForUser).toHaveBeenCalledWith(
      { repository: billingCustomerSyncRepository },
      {
        id: 'user_2kL9',
        email: 'alejandra@example.com',
        name: null,
        firstName: 'Alejandra',
        lastName: 'Reyes',
        username: 'alejandra',
        phone: null,
      },
      NOW
    )
    expect(session.deleteMany).not.toHaveBeenCalled()
  })

  it('returns a live user without restore, Billing, or session side effects', async () => {
    user.findUnique.mockResolvedValue(
      userRow({
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: BigInt(NOW),
      })
    )

    const response = await request(createApp())
      .post('/users/user_2kL9/restore')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(),
      error: null,
    })
    expect(user.findUnique).toHaveBeenCalledTimes(1)
    expect(user.update).not.toHaveBeenCalled()
    expect(enqueueCustomerEnsureForUser).not.toHaveBeenCalled()
    expect(session.deleteMany).not.toHaveBeenCalled()
  })

  it('returns user/not-found without restore, Billing, or session side effects', async () => {
    user.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/users/user_missing/restore')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'user/not-found',
        message: 'No user exists with the provided identifier.',
      },
    })
    expect(user.findUnique).toHaveBeenCalledTimes(1)
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_missing' },
      select: expect.any(Object),
    })
    expect(user.update).not.toHaveBeenCalled()
    expect(enqueueCustomerEnsureForUser).not.toHaveBeenCalled()
    expect(session.deleteMany).not.toHaveBeenCalled()
  })
})
