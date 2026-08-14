import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000

const { apiKey, repository, authProvider, getAuthProvider } = vi.hoisted(
  () => ({
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    repository: { findUserById: vi.fn(), updateUser: vi.fn() },
    authProvider: { updateUser: vi.fn() },
    getAuthProvider: vi.fn(),
  })
)

vi.mock('@/db/client', () => ({
  prisma: { apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/modules/users/users.repository', () => repository)
vi.mock('@/providers/workos/adapter', () => ({ getAuthProvider }))

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
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function serializedUser(row: ReturnType<typeof userRow>) {
  return {
    object: 'user',
    id: row.id,
    company: null,
    company_short_name: null,
    company_logo: null,
    workos_user_id: row.workosUserId,
    stripe_customer_id: row.stripeCustomerId,
    email: row.email,
    username: row.username,
    email_verified: row.emailVerified,
    first_name: row.firstName,
    last_name: row.lastName,
    middle_name: row.middleName,
    avatar: row.avatar,
    avatar_file_id: row.avatarFileId,
    platform_role: row.platformRole,
    status: row.status,
    banned: row.banned,
    banned_reason: row.bannedReason,
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
  repository.findUserById.mockResolvedValue(userRow())
  repository.updateUser.mockResolvedValue(userRow())
  getAuthProvider.mockReturnValue(authProvider)
  authProvider.updateUser.mockResolvedValue({})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PATCH /users/:userId', () => {
  it('pushes a changed first name to WorkOS after saving the local user', async () => {
    const updated = userRow({ firstName: 'Alex' })
    repository.updateUser.mockResolvedValue(updated)

    const response = await request(createApp())
      .patch('/users/user_2kL9')
      .set(ADMIN_HEADERS)
      .send({ first_name: 'Alex' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(updated),
      error: null,
    })
    expect(repository.updateUser).toHaveBeenCalledTimes(1)
    expect(repository.updateUser).toHaveBeenCalledWith('user_2kL9', {
      firstName: 'Alex',
      updatedAt: BigInt(NOW),
    })
    expect(authProvider.updateUser).toHaveBeenCalledTimes(1)
    expect(authProvider.updateUser).toHaveBeenCalledWith('user_workos_1', {
      firstName: 'Alex',
    })
  })

  it('pushes only a changed last name to WorkOS', async () => {
    const updated = userRow({ lastName: 'Kim' })
    repository.updateUser.mockResolvedValue(updated)

    const response = await request(createApp())
      .patch('/users/user_2kL9')
      .set(ADMIN_HEADERS)
      .send({ last_name: 'Kim' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(updated),
      error: null,
    })
    expect(repository.updateUser).toHaveBeenCalledTimes(1)
    expect(repository.updateUser).toHaveBeenCalledWith('user_2kL9', {
      lastName: 'Kim',
      updatedAt: BigInt(NOW),
    })
    expect(authProvider.updateUser).toHaveBeenCalledTimes(1)
    expect(authProvider.updateUser).toHaveBeenCalledWith('user_workos_1', {
      lastName: 'Kim',
    })
  })

  it('does not push WorkOS when the update has no name field', async () => {
    const updated = userRow({ status: 'suspended' })
    repository.updateUser.mockResolvedValue(updated)

    const response = await request(createApp())
      .patch('/users/user_2kL9')
      .set(ADMIN_HEADERS)
      .send({ status: 'suspended' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(updated),
      error: null,
    })
    expect(repository.updateUser).toHaveBeenCalledTimes(1)
    expect(repository.updateUser).toHaveBeenCalledWith('user_2kL9', {
      status: 'suspended',
      updatedAt: BigInt(NOW),
    })
    expect(authProvider.updateUser).not.toHaveBeenCalled()
  })

  it('returns the saved user when the WorkOS name push fails', async () => {
    const updated = userRow({ firstName: 'Alex' })
    repository.updateUser.mockResolvedValue(updated)
    authProvider.updateUser.mockRejectedValue(new Error('WorkOS unavailable'))

    const response = await request(createApp())
      .patch('/users/user_2kL9')
      .set(ADMIN_HEADERS)
      .send({ first_name: 'Alex' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(updated),
      error: null,
    })
    expect(repository.updateUser).toHaveBeenCalledTimes(1)
    expect(repository.updateUser).toHaveBeenCalledWith('user_2kL9', {
      firstName: 'Alex',
      updatedAt: BigInt(NOW),
    })
    expect(authProvider.updateUser).toHaveBeenCalledTimes(1)
    expect(authProvider.updateUser).toHaveBeenCalledWith('user_workos_1', {
      firstName: 'Alex',
    })
  })

  it('does not push WorkOS when the saved user has no WorkOS identity', async () => {
    const localUser = userRow({ workosUserId: null, firstName: 'Alex' })
    repository.findUserById.mockResolvedValue(userRow({ workosUserId: null }))
    repository.updateUser.mockResolvedValue(localUser)

    const response = await request(createApp())
      .patch('/users/user_2kL9')
      .set(ADMIN_HEADERS)
      .send({ first_name: 'Alex' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(localUser),
      error: null,
    })
    expect(repository.updateUser).toHaveBeenCalledTimes(1)
    expect(repository.updateUser).toHaveBeenCalledWith('user_2kL9', {
      firstName: 'Alex',
      updatedAt: BigInt(NOW),
    })
    expect(authProvider.updateUser).not.toHaveBeenCalled()
  })

  it('does not push WorkOS when the local save does not return a user', async () => {
    const existing = userRow()
    repository.updateUser.mockResolvedValue(null)

    const response = await request(createApp())
      .patch('/users/user_2kL9')
      .set(ADMIN_HEADERS)
      .send({ first_name: 'Alex' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: serializedUser(existing),
      error: null,
    })
    expect(repository.updateUser).toHaveBeenCalledTimes(1)
    expect(repository.updateUser).toHaveBeenCalledWith('user_2kL9', {
      firstName: 'Alex',
      updatedAt: BigInt(NOW),
    })
    expect(authProvider.updateUser).not.toHaveBeenCalled()
  })
})
