import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deleteMember } from './delete'
import { team } from './index'
import { list } from './list'
import { retrieve } from './retrieve'
import { update } from './update'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

describe('Console team service', () => {
  beforeEach(() => {
    prismaRef.current = {
      member: {
        create: vi.fn().mockResolvedValue({ userId: 'user_123' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ userId: 'user_123' }),
      },
    }
    vi.clearAllMocks()
  })

  it('creates an active access grant', async () => {
    const member = (
      prismaRef.current as never as {
        member: { create: ReturnType<typeof vi.fn> }
      }
    ).member

    const result = await create('user_123', 'support')

    expect(result).toEqual({ userId: 'user_123' })
    expect(member.create).toHaveBeenCalledTimes(1)
    expect(member.create).toHaveBeenCalledWith({
      data: { userId: 'user_123', roleName: 'support', status: 'active' },
    })
  })

  it('safely revokes zero or more access grants', async () => {
    const member = (
      prismaRef.current as never as {
        member: { deleteMany: ReturnType<typeof vi.fn> }
      }
    ).member

    const result = await deleteMember('user_123')

    expect(result).toEqual({ count: 1 })
    expect(member.deleteMany).toHaveBeenCalledTimes(1)
    expect(member.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
    })
  })

  it('lists members oldest first with their role', async () => {
    const member = (
      prismaRef.current as never as {
        member: { findMany: ReturnType<typeof vi.fn> }
      }
    ).member

    const result = await list()

    expect(result).toEqual([])
    expect(member.findMany).toHaveBeenCalledTimes(1)
    expect(member.findMany).toHaveBeenCalledWith({
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('retrieves a member by user ID with its role', async () => {
    const member = (
      prismaRef.current as never as {
        member: { findUnique: ReturnType<typeof vi.fn> }
      }
    ).member

    const result = await retrieve('user_123')

    expect(result).toBeNull()
    expect(member.findUnique).toHaveBeenCalledTimes(1)
    expect(member.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
      include: { role: true },
    })
  })

  it('updates an existing member role', async () => {
    const member = (
      prismaRef.current as never as {
        member: { update: ReturnType<typeof vi.fn> }
      }
    ).member

    const result = await update('user_123', { roleName: 'admin' })

    expect(result).toEqual({ userId: 'user_123' })
    expect(member.update).toHaveBeenCalledTimes(1)
    expect(member.update).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
      data: { roleName: 'admin' },
    })
  })

  it('exposes each operation on the team facade', () => {
    expect(team).toEqual({
      retrieve,
      list,
      create,
      update,
      delete: deleteMember,
    })
  })
})
