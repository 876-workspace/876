import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Role } from '@/lib/db'
import { allPermissionKeys, PERMISSION_CATALOG } from '@/lib/permissions'

type MockPrismaClient = {
  role: {
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { roles } from './index'

const NOW = Math.floor(new Date('2026-07-21T12:00:00Z').getTime() / 1000)

function createRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role_dispatcher',
    tenantId: 'ten_rocketship',
    name: 'Dispatcher',
    description: 'Coordinates daily parcel movement.',
    systemKey: null,
    permissions: ['items.view', 'packages.view'],
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

describe('service.roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T12:00:00Z'))
    mockPrismaRef.current = {
      role: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists tenant roles with resolved permissions and member counts', async () => {
    const findMany = mockPrismaRef.current!.role.findMany
    findMany.mockResolvedValue([
      {
        ...createRole({
          id: 'role_admin',
          name: 'Admin',
          description: 'Unrestricted access to every module.',
          systemKey: 'admin',
          permissions: [],
        }),
        _count: { members: 2 },
      },
      { ...createRole(), _count: { members: 4 } },
    ])

    const result = await roles.list('ten_rocketship')

    expect(result).toEqual([
      {
        id: 'role_admin',
        name: 'Admin',
        description: 'Unrestricted access to every module.',
        permissions: allPermissionKeys(PERMISSION_CATALOG),
        isDefault: true,
        systemKey: 'admin',
        memberCount: 2,
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
      {
        id: 'role_dispatcher',
        name: 'Dispatcher',
        description: 'Coordinates daily parcel movement.',
        permissions: ['items.view', 'packages.view'],
        isDefault: false,
        systemKey: null,
        memberCount: 4,
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
    ])
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_rocketship' },
      include: { _count: { select: { members: true } } },
      orderBy: [{ systemKey: 'asc' }, { name: 'asc' }],
    })
  })

  it('retrieves and serializes a tenant role by ID', async () => {
    const findFirst = mockPrismaRef.current!.role.findFirst
    findFirst.mockResolvedValue({
      ...createRole(),
      _count: { members: 3 },
    })

    const result = await roles.retrieve('ten_rocketship', 'role_dispatcher')

    expect(result).toEqual({
      id: 'role_dispatcher',
      name: 'Dispatcher',
      description: 'Coordinates daily parcel movement.',
      permissions: ['items.view', 'packages.view'],
      isDefault: false,
      systemKey: null,
      memberCount: 3,
      createdAt: 1_784_419_200,
      updatedAt: 1_784_419_200,
    })
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'role_dispatcher', tenantId: 'ten_rocketship' },
      include: { _count: { select: { members: true } } },
    })
  })

  it('returns null when a tenant role does not exist', async () => {
    const findFirst = mockPrismaRef.current!.role.findFirst

    const result = await roles.retrieve('ten_rocketship', 'role_missing')

    expect(result).toBeNull()
    expect(findFirst).toHaveBeenCalledTimes(1)
  })

  it('creates a trimmed custom role and serializes the complete result', async () => {
    const create = mockPrismaRef.current!.role.create
    create.mockResolvedValue(createRole({ updatedAt: NOW, createdAt: NOW }))

    const result = await roles.create('ten_rocketship', {
      name: '  Dispatcher  ',
      description: 'Coordinates daily parcel movement.',
      permissions: ['items.view', 'packages.view'],
    })

    expect(result).toEqual({
      data: {
        id: 'role_dispatcher',
        name: 'Dispatcher',
        description: 'Coordinates daily parcel movement.',
        permissions: ['items.view', 'packages.view'],
        isDefault: false,
        systemKey: null,
        memberCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      },
      error: null,
    })
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_rocketship',
        name: 'Dispatcher',
        description: 'Coordinates daily parcel movement.',
        systemKey: null,
        permissions: ['items.view', 'packages.view'],
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('rejects unknown permission keys without creating a role', async () => {
    const create = mockPrismaRef.current!.role.create

    const result = await roles.create('ten_rocketship', {
      name: 'Dispatcher',
      permissions: ['items.view', 'items.full'],
    })

    expect(result).toEqual({
      data: null,
      error: 'One or more permission keys are invalid.',
      status: 400,
      code: 'role/invalid-permission',
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('maps a role-name uniqueness conflict to the exact client-safe error', async () => {
    const create = mockPrismaRef.current!.role.create
    create.mockRejectedValue({ code: 'P2002' })

    const result = await roles.create('ten_rocketship', {
      name: 'Dispatcher',
      permissions: ['items.view'],
    })

    expect(result).toEqual({
      data: null,
      error: 'A role with that name already exists.',
      status: 409,
      code: 'role/name-taken',
    })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('updates and serializes a custom role', async () => {
    const findFirst = mockPrismaRef.current!.role.findFirst
    const update = mockPrismaRef.current!.role.update
    findFirst.mockResolvedValue(createRole())
    update.mockResolvedValue({
      ...createRole({
        name: 'Operations',
        permissions: ['items.view', 'warehouse.view'],
        updatedAt: NOW,
      }),
      _count: { members: 5 },
    })

    const result = await roles.update('ten_rocketship', 'role_dispatcher', {
      name: '  Operations  ',
      permissions: ['items.view', 'warehouse.view'],
    })

    expect(result).toEqual({
      data: {
        id: 'role_dispatcher',
        name: 'Operations',
        description: 'Coordinates daily parcel movement.',
        permissions: ['items.view', 'warehouse.view'],
        isDefault: false,
        systemKey: null,
        memberCount: 5,
        createdAt: 1_784_419_200,
        updatedAt: NOW,
      },
      error: null,
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      where: { id: 'role_dispatcher' },
      data: {
        name: 'Operations',
        permissions: ['items.view', 'warehouse.view'],
        updatedAt: NOW,
      },
      include: { _count: { select: { members: true } } },
    })
  })

  it('rejects updates to a default role before writing', async () => {
    const findFirst = mockPrismaRef.current!.role.findFirst
    const update = mockPrismaRef.current!.role.update
    findFirst.mockResolvedValue(createRole({ systemKey: 'staff' }))

    const result = await roles.update('ten_rocketship', 'role_staff', {
      name: 'Crew',
    })

    expect(result).toEqual({
      data: null,
      error: 'Default roles cannot be edited or deleted.',
      status: 400,
      code: 'role/default-immutable',
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects deletion of a default role before writing', async () => {
    const findFirst = mockPrismaRef.current!.role.findFirst
    const deleteRole = mockPrismaRef.current!.role.delete
    findFirst.mockResolvedValue({
      ...createRole({ systemKey: 'admin' }),
      _count: { members: 1 },
    })

    const result = await roles.delete('ten_rocketship', 'role_admin')

    expect(result).toEqual({
      data: null,
      error: 'Default roles cannot be edited or deleted.',
      status: 400,
      code: 'role/default-immutable',
    })
    expect(deleteRole).not.toHaveBeenCalled()
  })

  it('rejects deletion while a custom role still has members', async () => {
    const findFirst = mockPrismaRef.current!.role.findFirst
    const deleteRole = mockPrismaRef.current!.role.delete
    findFirst.mockResolvedValue({
      ...createRole(),
      _count: { members: 2 },
    })

    const result = await roles.delete('ten_rocketship', 'role_dispatcher')

    expect(result).toEqual({
      data: null,
      error: 'Reassign all team members before deleting this role.',
      status: 409,
      code: 'role/in-use',
    })
    expect(deleteRole).not.toHaveBeenCalled()
  })

  it('deletes an unused custom role and returns its tombstone', async () => {
    const findFirst = mockPrismaRef.current!.role.findFirst
    const deleteRole = mockPrismaRef.current!.role.delete
    findFirst.mockResolvedValue({
      ...createRole(),
      _count: { members: 0 },
    })
    deleteRole.mockResolvedValue(createRole())

    const result = await roles.delete('ten_rocketship', 'role_dispatcher')

    expect(result).toEqual({
      data: { id: 'role_dispatcher', deleted: true },
      error: null,
    })
    expect(deleteRole).toHaveBeenCalledTimes(1)
    expect(deleteRole).toHaveBeenCalledWith({
      where: { id: 'role_dispatcher' },
    })
  })

  it('creates both catalog-backed default roles when none exist', async () => {
    const findMany = mockPrismaRef.current!.role.findMany
    const create = mockPrismaRef.current!.role.create
    findMany.mockResolvedValue([])
    create.mockResolvedValue({})

    const result = await roles.ensureDefaults('ten_rocketship')

    expect(result).toBeUndefined()
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_rocketship',
        systemKey: { in: ['admin', 'staff'] },
      },
      select: { systemKey: true },
    })
    expect(create).toHaveBeenCalledTimes(2)
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        tenantId: 'ten_rocketship',
        name: 'Admin',
        description: 'Unrestricted access to every module.',
        systemKey: 'admin',
        permissions: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
    expect(create).toHaveBeenNthCalledWith(2, {
      data: {
        tenantId: 'ten_rocketship',
        name: 'Staff',
        description: 'Access to every module except Reports and Settings.',
        systemKey: 'staff',
        permissions: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('creates only the missing default role when one already exists', async () => {
    const findMany = mockPrismaRef.current!.role.findMany
    const create = mockPrismaRef.current!.role.create
    findMany.mockResolvedValue([{ systemKey: 'admin' }])
    create.mockResolvedValue({})

    await roles.ensureDefaults('ten_rocketship')

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_rocketship',
        name: 'Staff',
        description: 'Access to every module except Reports and Settings.',
        systemKey: 'staff',
        permissions: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('does not write when both default roles already exist', async () => {
    const findMany = mockPrismaRef.current!.role.findMany
    const create = mockPrismaRef.current!.role.create
    findMany.mockResolvedValue([{ systemKey: 'admin' }, { systemKey: 'staff' }])

    await roles.ensureDefaults('ten_rocketship')

    expect(create).not.toHaveBeenCalled()
  })

  it('tolerates a concurrent ensure winning the default-role create race', async () => {
    const findMany = mockPrismaRef.current!.role.findMany
    const create = mockPrismaRef.current!.role.create
    findMany.mockResolvedValue([])
    create.mockRejectedValue({ code: 'P2002' })

    await expect(
      roles.ensureDefaults('ten_rocketship')
    ).resolves.toBeUndefined()

    expect(create).toHaveBeenCalledTimes(2)
  })

  it('rethrows non-unique-constraint errors from default-role creation', async () => {
    const findMany = mockPrismaRef.current!.role.findMany
    const create = mockPrismaRef.current!.role.create
    findMany.mockResolvedValue([])
    create.mockRejectedValue(new Error('connection lost'))

    await expect(roles.ensureDefaults('ten_rocketship')).rejects.toThrow(
      'connection lost'
    )
  })
})

it('rejects create params that fail schema validation without writing', async () => {
  const create = mockPrismaRef.current!.role.create

  const result = await roles.create('ten_rocketship', {
    name: '',
    permissions: ['items.view'],
  })

  expect(result).toEqual({
    data: null,
    error: 'The provided data failed validation.',
    status: 422,
    code: 'error/validation-failed',
  })
  expect(create).not.toHaveBeenCalled()
})

it('returns not-found when updating a missing role', async () => {
  const findFirst = mockPrismaRef.current!.role.findFirst
  const update = mockPrismaRef.current!.role.update
  findFirst.mockResolvedValue(null)

  const result = await roles.update('ten_rocketship', 'role_missing', {
    name: 'Dispatch',
  })

  expect(result).toEqual({
    data: null,
    error: 'The requested role was not found.',
    status: 404,
    code: 'role/not-found',
  })
  expect(update).not.toHaveBeenCalled()
})

it('rejects invalid permission keys on update without writing', async () => {
  const findFirst = mockPrismaRef.current!.role.findFirst
  const update = mockPrismaRef.current!.role.update
  findFirst.mockResolvedValue(createRole())

  const result = await roles.update('ten_rocketship', 'role_dispatcher', {
    permissions: ['items.view', 'items.full'],
  })

  expect(result).toEqual({
    data: null,
    error: 'One or more permission keys are invalid.',
    status: 400,
    code: 'role/invalid-permission',
  })
  expect(update).not.toHaveBeenCalled()
})

it('maps a rename uniqueness conflict on update to name-taken', async () => {
  const findFirst = mockPrismaRef.current!.role.findFirst
  const update = mockPrismaRef.current!.role.update
  findFirst.mockResolvedValue(createRole())
  update.mockRejectedValue({ code: 'P2002' })

  const result = await roles.update('ten_rocketship', 'role_dispatcher', {
    name: 'Admin',
  })

  expect(result).toEqual({
    data: null,
    error: 'A role with that name already exists.',
    status: 409,
    code: 'role/name-taken',
  })
})

it('returns not-found when deleting a missing role', async () => {
  const findFirst = mockPrismaRef.current!.role.findFirst
  const deleteRole = mockPrismaRef.current!.role.delete
  findFirst.mockResolvedValue(null)

  const result = await roles.delete('ten_rocketship', 'role_missing')

  expect(result).toEqual({
    data: null,
    error: 'The requested role was not found.',
    status: 404,
    code: 'role/not-found',
  })
  expect(deleteRole).not.toHaveBeenCalled()
})

it('resolves staff default permissions from the catalog, ignoring stored JSON', async () => {
  const findFirst = mockPrismaRef.current!.role.findFirst
  findFirst.mockResolvedValue({
    ...createRole({
      id: 'role_staff',
      name: 'Staff',
      systemKey: 'staff',
      permissions: ['bogus.stored'],
    }),
    _count: { members: 0 },
  })

  const result = await roles.retrieve('ten_rocketship', 'role_staff')

  expect(result?.isDefault).toBe(true)
  expect(result?.systemKey).toBe('staff')
  expect(result?.permissions).toEqual(
    allPermissionKeys(PERMISSION_CATALOG).filter(
      (key) => !key.startsWith('reports.') && !key.startsWith('settings.')
    )
  )
})

it('rethrows non-unique-constraint errors from custom role create', async () => {
  const create = mockPrismaRef.current!.role.create
  create.mockRejectedValue(new Error('disk full'))

  await expect(
    roles.create('ten_rocketship', {
      name: 'Dispatcher',
      permissions: ['items.view'],
    })
  ).rejects.toThrow('disk full')
})
