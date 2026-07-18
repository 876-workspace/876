import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deleteRole } from './delete'
import { roles } from './index'
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

function createRoleRow(overrides: Record<string, unknown> = {}) {
  return {
    name: 'support',
    displayName: 'Support',
    description: 'Handles customer support.',
    permissions: ['console:access', 'users:read'],
    isSystem: false,
    ...overrides,
  }
}

describe('Console role service', () => {
  beforeEach(() => {
    prismaRef.current = {
      role: {
        create: vi.fn().mockResolvedValue(createRoleRow()),
        delete: vi.fn().mockResolvedValue(createRoleRow()),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({
          ...createRoleRow(),
          _count: { members: 3 },
        }),
      },
    }
    vi.clearAllMocks()
  })

  it('creates a custom role with explicit fields', async () => {
    const role = (
      prismaRef.current as never as {
        role: { create: ReturnType<typeof vi.fn> }
      }
    ).role

    const result = await create({
      name: 'support',
      displayName: 'Support',
      description: 'Handles customer support.',
      permissions: ['console:access', 'users:read'],
    })

    expect(result).toEqual({
      data: { ...createRoleRow(), userCount: 0 },
      error: null,
    })
    expect(role.create).toHaveBeenCalledTimes(1)
    expect(role.create).toHaveBeenCalledWith({
      data: {
        name: 'support',
        displayName: 'Support',
        description: 'Handles customer support.',
        permissions: ['console:access', 'users:read'],
        isSystem: false,
      },
    })
  })

  it('defaults omitted description and permissions', async () => {
    const role = (
      prismaRef.current as never as {
        role: { create: ReturnType<typeof vi.fn> }
      }
    ).role

    const result = await create({ name: 'support', displayName: 'Support' })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ ...createRoleRow(), userCount: 0 })
    expect(role.create).toHaveBeenCalledWith({
      data: {
        name: 'support',
        displayName: 'Support',
        description: '',
        permissions: [],
        isSystem: false,
      },
    })
  })

  it('maps a unique constraint conflict to a client-safe error', async () => {
    const role = (
      prismaRef.current as never as {
        role: { create: ReturnType<typeof vi.fn> }
      }
    ).role
    role.create.mockRejectedValue({ code: 'P2002' })

    const result = await create({ name: 'support', displayName: 'Support' })

    expect(result).toEqual({
      data: null,
      error: 'A role with that name already exists.',
      status: undefined,
    })
  })

  it.each([new Error('database unavailable'), { code: 'P2025' }, null])(
    'rethrows non-unique create failure %j',
    async (error) => {
      const role = (
        prismaRef.current as never as {
          role: { create: ReturnType<typeof vi.fn> }
        }
      ).role
      role.create.mockRejectedValue(error)

      await expect(
        create({ name: 'support', displayName: 'Support' })
      ).rejects.toBe(error)
    }
  )

  it('lists all roles with member counts', async () => {
    const role = (
      prismaRef.current as never as {
        role: { findMany: ReturnType<typeof vi.fn> }
      }
    ).role

    const result = await list()

    expect(result).toEqual([])
    expect(role.findMany).toHaveBeenCalledTimes(1)
    expect(role.findMany).toHaveBeenCalledWith({
      include: { _count: { select: { members: true } } },
    })
  })

  it('retrieves a role by name with member count', async () => {
    const role = (
      prismaRef.current as never as {
        role: { findUnique: ReturnType<typeof vi.fn> }
      }
    ).role

    const result = await retrieve('support')

    expect(result).toBeNull()
    expect(role.findUnique).toHaveBeenCalledTimes(1)
    expect(role.findUnique).toHaveBeenCalledWith({
      where: { name: 'support' },
      include: { _count: { select: { members: true } } },
    })
  })

  it('updates only explicitly supplied fields', async () => {
    const role = (
      prismaRef.current as never as {
        role: { update: ReturnType<typeof vi.fn> }
      }
    ).role

    const result = await update('support', {
      displayName: 'Customer Support',
      description: 'Updated.',
      permissions: ['console:access'],
    })

    expect(result).toEqual({
      data: { ...createRoleRow(), userCount: 3 },
      error: null,
    })
    expect(role.update).toHaveBeenCalledTimes(1)
    expect(role.update).toHaveBeenCalledWith({
      where: { name: 'support' },
      data: {
        displayName: 'Customer Support',
        description: 'Updated.',
        permissions: ['console:access'],
      },
      include: { _count: { select: { members: true } } },
    })
  })

  it('sends no field changes for an empty update', async () => {
    const role = (
      prismaRef.current as never as {
        role: { update: ReturnType<typeof vi.fn> }
      }
    ).role

    const result = await update('support', {})

    expect(result.error).toBeNull()
    expect(role.update).toHaveBeenCalledWith({
      where: { name: 'support' },
      data: {},
      include: { _count: { select: { members: true } } },
    })
  })

  it('returns 404 when deleting a missing role', async () => {
    const role = (
      prismaRef.current as never as {
        role: { delete: ReturnType<typeof vi.fn> }
      }
    ).role

    const result = await deleteRole('missing')

    expect(result).toEqual({
      data: null,
      error: 'Role not found.',
      status: 404,
    })
    expect(role.delete).not.toHaveBeenCalled()
  })

  it('protects system roles from deletion', async () => {
    const role = (
      prismaRef.current as never as {
        role: {
          findUnique: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).role
    role.findUnique.mockResolvedValue({
      ...createRoleRow({ isSystem: true }),
      _count: { members: 0 },
    })

    const result = await deleteRole('staff')

    expect(result).toEqual({
      data: null,
      error: 'System roles cannot be deleted.',
      status: undefined,
    })
    expect(role.delete).not.toHaveBeenCalled()
  })

  it('protects a custom role that still has members', async () => {
    const role = (
      prismaRef.current as never as {
        role: {
          findUnique: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).role
    role.findUnique.mockResolvedValue({
      ...createRoleRow(),
      _count: { members: 2 },
    })

    const result = await deleteRole('support')

    expect(result).toEqual({
      data: null,
      error: 'Reassign the 2 user(s) on this role before deleting it.',
      status: undefined,
    })
    expect(role.delete).not.toHaveBeenCalled()
  })

  it('deletes an unassigned custom role', async () => {
    const role = (
      prismaRef.current as never as {
        role: {
          findUnique: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).role
    role.findUnique.mockResolvedValue({
      ...createRoleRow(),
      _count: { members: 0 },
    })

    const result = await deleteRole('support')

    expect(result).toEqual({
      data: { name: 'support', deleted: true },
      error: null,
    })
    expect(role.delete).toHaveBeenCalledTimes(1)
    expect(role.delete).toHaveBeenCalledWith({ where: { name: 'support' } })
  })

  it('exposes every operation on the role facade', () => {
    expect(roles).toEqual({
      retrieve,
      list,
      create,
      update,
      delete: deleteRole,
    })
  })
})
