import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000

const {
  user,
  session,
  apiKey,
  deleteProviderUser,
  enqueueCustomerArchiveForUser,
  billingCustomerSyncRepository,
  authProvider,
  purgeCascade,
} = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  session: { deleteMany: vi.fn() },
  // purgeUser clears the records that reference the account without a cascade
  // (and detaches the ones an organization owns) before deleting the user, all
  // inside one transaction.
  purgeCascade: {
    authAttempt: { deleteMany: vi.fn() },
    auditEvent: { deleteMany: vi.fn() },
    communicationCall: { deleteMany: vi.fn() },
    communicationMessage: { deleteMany: vi.fn() },
    billingCustomerOutbox: { deleteMany: vi.fn(), updateMany: vi.fn() },
    orgContact: { updateMany: vi.fn() },
    organization: { updateMany: vi.fn() },
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  deleteProviderUser: vi.fn(),
  enqueueCustomerArchiveForUser: vi.fn(),
  billingCustomerSyncRepository: { enqueue: vi.fn() },
  authProvider: { deleteUser: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    user,
    session,
    apiKey,
    ...purgeCascade,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      await fn({ ...purgeCascade, user }),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/services/identity-sync', () => ({
  deleteProviderUser,
}))

vi.mock('@/services/billing-customer-sync', () => ({
  enqueueCustomerArchiveForUser,
  enqueueCustomerEnsureForUser: vi.fn(),
}))

vi.mock('@/services/billing-customer-sync.repository', () => ({
  createBillingCustomerSyncRepository: vi.fn(
    () => billingCustomerSyncRepository
  ),
}))

vi.mock('@/providers/workos/adapter', () => ({
  getAuthProvider: vi.fn(() => authProvider),
}))

const { createApp } = await import('@/application')

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
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW),
    ...overrides,
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
  user.update.mockResolvedValue(userRow({ deletedAt: BigInt(NOW) }))
  user.delete.mockResolvedValue(userRow())
  session.deleteMany.mockResolvedValue({ count: 2 })
  deleteProviderUser.mockResolvedValue(true)
  enqueueCustomerArchiveForUser.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DELETE /users/:userId', () => {
  it('soft-deletes the user and sessions without deleting the provider user', async () => {
    const response = await request(createApp())
      .delete('/users/user_2kL9?deleted_by=user_admin&reason=duplicate')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'user',
        id: 'user_2kL9',
        deleted: true,
      },
      error: null,
    })
    expect(user.update).toHaveBeenCalledTimes(1)
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user_2kL9' },
      data: {
        deletedAt: BigInt(NOW),
        deletedBy: 'user_admin',
        deletionReason: 'duplicate',
        updatedAt: BigInt(NOW),
      },
      select: expect.any(Object),
    })
    expect(session.deleteMany).toHaveBeenCalledTimes(1)
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_2kL9' },
    })
    expect(enqueueCustomerArchiveForUser).toHaveBeenCalledTimes(1)
    expect(enqueueCustomerArchiveForUser).toHaveBeenCalledWith(
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
    expect(deleteProviderUser).not.toHaveBeenCalled()
    expect(user.delete).not.toHaveBeenCalled()
  })
})

describe('DELETE /users/:userId/purge', () => {
  it('archives and purges the user and sessions before deleting the provider user', async () => {
    const response = await request(createApp())
      .delete('/users/user_2kL9/purge')
      .set(ADMIN_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'user',
        id: 'user_2kL9',
        deleted: true,
      },
      error: null,
    })
    expect(enqueueCustomerArchiveForUser).toHaveBeenCalledTimes(1)
    expect(enqueueCustomerArchiveForUser).toHaveBeenCalledWith(
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
    expect(session.deleteMany).toHaveBeenCalledTimes(1)
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_2kL9' },
    })
    expect(user.delete).toHaveBeenCalledTimes(1)
    expect(user.delete).toHaveBeenCalledWith({ where: { id: 'user_2kL9' } })
    expect(deleteProviderUser).toHaveBeenCalledTimes(1)
    expect(deleteProviderUser).toHaveBeenCalledWith(
      authProvider,
      'user_workos_1',
      { localUserId: 'user_2kL9' }
    )
    expect(
      enqueueCustomerArchiveForUser.mock.invocationCallOrder[0]
    ).toBeLessThan(user.delete.mock.invocationCallOrder[0] as number)
    expect(user.update).not.toHaveBeenCalled()
  })
})
