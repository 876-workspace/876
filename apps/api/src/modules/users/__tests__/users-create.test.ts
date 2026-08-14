import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000

const {
  apiKey,
  repository,
  usersService,
  authProvider,
  getAuthProvider,
  deleteProviderUser,
} = vi.hoisted(() => ({
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  repository: {
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    createProfileForUser: vi.fn(),
  },
  usersService: {
    assertUsernameAvailable: vi.fn(),
    uniqueUsername: vi.fn(),
    normalizeUsername: vi.fn(),
  },
  authProvider: {
    getUserByEmail: vi.fn(),
    register: vi.fn(),
    sendRecovery: vi.fn(),
  },
  getAuthProvider: vi.fn(),
  deleteProviderUser: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/modules/users/users.repository', () => repository)
vi.mock('@/modules/users/users.service', () => usersService)
vi.mock('@/providers/workos/adapter', () => ({ getAuthProvider }))
vi.mock('@/services/identity-sync', () => ({ deleteProviderUser }))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function providerUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_workos_1',
    email: 'alejandra@example.com',
    firstName: 'Provider',
    lastName: 'Identity',
    emailVerified: true,
    avatar: 'https://images.example.com/avatar.png',
    metadata: {},
    ...overrides,
  }
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_2kL9',
    workosUserId: 'user_workos_1',
    stripeCustomerId: null,
    email: 'alejandra@example.com',
    username: 'alejandra',
    emailVerified: true,
    firstName: 'Provider',
    lastName: 'Identity',
    middleName: null,
    avatar: 'https://images.example.com/avatar.png',
    avatarFileId: null,
    platformRole: null,
    status: 'active',
    banned: false,
    bannedReason: null,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
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
  repository.findUserByEmail.mockResolvedValue(null)
  repository.createUser.mockResolvedValue(userRow())
  repository.createProfileForUser.mockResolvedValue({})
  usersService.assertUsernameAvailable.mockResolvedValue('alejandra')
  getAuthProvider.mockReturnValue(authProvider)
  authProvider.getUserByEmail.mockResolvedValue(providerUser())
  authProvider.register.mockResolvedValue(providerUser())
  authProvider.sendRecovery.mockResolvedValue(undefined)
  deleteProviderUser.mockResolvedValue(true)
})

describe('POST /users', () => {
  it('adopts an existing WorkOS identity missing from the local database', async () => {
    const response = await request(createApp())
      .post('/users')
      .set(ADMIN_HEADERS)
      .send({
        email: 'Alejandra@Example.com ',
        first_name: 'Console',
        last_name: 'Input',
        username: 'alejandra',
      })

    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data.workos_user_id).toBe('user_workos_1')
    expect(authProvider.getUserByEmail).toHaveBeenCalledWith(
      'alejandra@example.com'
    )
    expect(authProvider.register).not.toHaveBeenCalled()
    expect(repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        workosUserId: 'user_workos_1',
        email: 'alejandra@example.com',
        emailVerified: true,
        firstName: 'Provider',
        lastName: 'Identity',
        avatar: 'https://images.example.com/avatar.png',
      })
    )
  })

  it('honors an explicit email_verified over the provider identity', async () => {
    authProvider.getUserByEmail.mockResolvedValue(
      providerUser({ emailVerified: false })
    )

    const response = await request(createApp())
      .post('/users')
      .set(ADMIN_HEADERS)
      .send({
        email: 'alejandra@example.com',
        first_name: 'Console',
        last_name: 'Input',
        username: 'alejandra',
        email_verified: true,
      })

    expect(response.status).toBe(201)
    expect(repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: true })
    )
  })

  it('creates a WorkOS identity when no provider user exists', async () => {
    authProvider.getUserByEmail.mockResolvedValue(null)
    authProvider.register.mockResolvedValue(
      providerUser({
        firstName: 'Console',
        lastName: 'Input',
        emailVerified: false,
        avatar: null,
      })
    )
    repository.createUser.mockResolvedValue(
      userRow({
        emailVerified: false,
        firstName: 'Console',
        lastName: 'Input',
        avatar: null,
      })
    )

    const response = await request(createApp())
      .post('/users')
      .set(ADMIN_HEADERS)
      .send({
        email: 'alejandra@example.com',
        first_name: 'Console',
        last_name: 'Input',
        username: 'alejandra',
      })

    expect(response.status).toBe(201)
    expect(authProvider.register).toHaveBeenCalledWith({
      email: 'alejandra@example.com',
      firstName: 'Console',
      lastName: 'Input',
      emailVerified: false,
    })
    expect(
      usersService.assertUsernameAvailable.mock.invocationCallOrder[0]
    ).toBeLessThan(authProvider.register.mock.invocationCallOrder[0] as number)
  })

  it('rejects a duplicate local user before contacting WorkOS', async () => {
    repository.findUserByEmail.mockResolvedValue(userRow())

    const response = await request(createApp())
      .post('/users')
      .set(ADMIN_HEADERS)
      .send({
        email: 'alejandra@example.com',
        first_name: 'Console',
        last_name: 'Input',
        username: 'alejandra',
      })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('user/duplicate-email')
    expect(authProvider.getUserByEmail).not.toHaveBeenCalled()
    expect(authProvider.register).not.toHaveBeenCalled()
    expect(repository.createUser).not.toHaveBeenCalled()
  })

  it('does not contact WorkOS when local username validation fails', async () => {
    usersService.assertUsernameAvailable.mockRejectedValue(
      new Error('username unavailable')
    )

    const response = await request(createApp())
      .post('/users')
      .set(ADMIN_HEADERS)
      .send({
        email: 'alejandra@example.com',
        first_name: 'Console',
        last_name: 'Input',
        username: 'taken',
      })

    expect(response.status).toBe(500)
    expect(authProvider.getUserByEmail).not.toHaveBeenCalled()
    expect(authProvider.register).not.toHaveBeenCalled()
  })

  it('removes a newly-created WorkOS identity when the local insert fails', async () => {
    authProvider.getUserByEmail.mockResolvedValue(null)
    repository.createUser.mockRejectedValue(new Error('database unavailable'))

    const response = await request(createApp())
      .post('/users')
      .set(ADMIN_HEADERS)
      .send({
        email: 'alejandra@example.com',
        first_name: 'Console',
        last_name: 'Input',
        username: 'alejandra',
      })

    expect(response.status).toBe(500)
    expect(deleteProviderUser).toHaveBeenCalledWith(
      authProvider,
      'user_workos_1',
      { localUserId: expect.stringMatching(/^user_/) }
    )
  })
})
