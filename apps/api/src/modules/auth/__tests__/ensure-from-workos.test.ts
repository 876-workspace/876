import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/platform/errors'
import type { UserRow } from '@/modules/auth/auth.repository'

const NOW = 1_785_000_000

type MockPrismaClient = {
  user: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  userProfile: { create: ReturnType<typeof vi.fn> }
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/db/client', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { ensureFromWorkos } = await import('@/modules/auth/auth.repository')

function userRow(overrides: Partial<UserRow> = {}): UserRow {
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
    status: 'active',
    banned: false,
    bannedReason: null,
    deletedAt: null,
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function providerUser() {
  return {
    id: 'user_workos_1',
    email: 'Alejandra@Example.com ',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    emailVerified: true,
    avatar: null,
  }
}

function errorContract(error: AppHttpError) {
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    httpStatus: error.httpStatus,
    description: error.description,
    param: error.param,
    extra: error.extra,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))
  mockPrismaRef.current = {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    userProfile: { create: vi.fn() },
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ensureFromWorkos', () => {
  it('rejects a tombstoned account matched by WorkOS id', async () => {
    const prisma = mockPrismaRef.current as MockPrismaClient
    prisma.user.findFirst.mockResolvedValue({
      id: 'user_2kL9',
      deletedAt: BigInt(NOW - 10),
    })

    const error = await ensureFromWorkos(providerUser()).then(
      () => null,
      (reason: unknown) => reason
    )

    expect(error).toBeInstanceOf(AppHttpError)
    expect(errorContract(error as AppHttpError)).toEqual({
      name: 'AppHttpError',
      code: 'auth/account-deleted',
      message: 'This account is no longer available.',
      httpStatus: 403,
      description: undefined,
      param: undefined,
      extra: undefined,
    })
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(1)
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { workosUserId: 'user_workos_1' },
      select: { id: true, deletedAt: true },
    })
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('rejects a tombstoned account matched by normalized email', async () => {
    const prisma = mockPrismaRef.current as MockPrismaClient
    prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'user_2kL9',
      deletedAt: BigInt(NOW - 10),
    })

    const error = await ensureFromWorkos(providerUser()).then(
      () => null,
      (reason: unknown) => reason
    )

    expect(error).toBeInstanceOf(AppHttpError)
    expect(errorContract(error as AppHttpError)).toEqual({
      name: 'AppHttpError',
      code: 'auth/account-deleted',
      message: 'This account is no longer available.',
      httpStatus: 403,
      description: undefined,
      param: undefined,
      extra: undefined,
    })
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2)
    expect(prisma.user.findFirst).toHaveBeenNthCalledWith(1, {
      where: { workosUserId: 'user_workos_1' },
      select: { id: true, deletedAt: true },
    })
    expect(prisma.user.findFirst).toHaveBeenNthCalledWith(2, {
      where: { email: 'alejandra@example.com' },
      select: { id: true, deletedAt: true },
    })
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('rejects an existing banned account', async () => {
    const prisma = mockPrismaRef.current as MockPrismaClient
    prisma.user.findFirst
      .mockResolvedValueOnce({ id: 'user_2kL9', deletedAt: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(userRow({ banned: true }))

    const error = await ensureFromWorkos(providerUser()).then(
      () => null,
      (reason: unknown) => reason
    )

    expect(error).toBeInstanceOf(AppHttpError)
    expect(errorContract(error as AppHttpError)).toEqual({
      name: 'AppHttpError',
      code: 'auth/account-suspended',
      message: 'This account has been suspended.',
      httpStatus: 403,
      description: undefined,
      param: undefined,
      extra: undefined,
    })
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(3)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('rejects an existing suspended account', async () => {
    const prisma = mockPrismaRef.current as MockPrismaClient
    prisma.user.findFirst
      .mockResolvedValueOnce({ id: 'user_2kL9', deletedAt: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(userRow({ status: 'suspended' }))

    const error = await ensureFromWorkos(providerUser()).then(
      () => null,
      (reason: unknown) => reason
    )

    expect(error).toBeInstanceOf(AppHttpError)
    expect(errorContract(error as AppHttpError)).toEqual({
      name: 'AppHttpError',
      code: 'auth/account-suspended',
      message: 'This account has been suspended.',
      httpStatus: 403,
      description: undefined,
      param: undefined,
      extra: undefined,
    })
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(3)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('updates and returns an existing inactive account', async () => {
    const prisma = mockPrismaRef.current as MockPrismaClient
    const inactiveUser = userRow({ status: 'inactive' })
    const updatedUser = userRow({
      status: 'inactive',
      email: 'alejandra@example.com',
      updatedAt: BigInt(NOW),
    })
    prisma.user.findFirst
      .mockResolvedValueOnce({ id: 'user_2kL9', deletedAt: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(inactiveUser)
    prisma.user.update.mockResolvedValue(updatedUser)

    const result = await ensureFromWorkos(providerUser())

    expect(result).toEqual(updatedUser)
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(3)
    expect(prisma.user.update).toHaveBeenCalledTimes(1)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_2kL9' },
      data: {
        email: 'alejandra@example.com',
        emailVerified: true,
        firstName: 'Alejandra',
        lastName: 'Reyes',
        avatar: null,
        platformRole: undefined,
        updatedAt: BigInt(NOW),
      },
      select: expect.any(Object),
    })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
