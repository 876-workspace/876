import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Role, TeamMember } from '@/lib/db'

type MockPrismaClient = {
  role: {
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  teamMember: {
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
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

import { team } from './index'

const NOW = Math.floor(new Date('2026-07-21T12:00:00Z').getTime() / 1000)

function createRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role_dispatcher',
    tenantId: 'ten_rocketship',
    name: 'Dispatcher',
    description: 'Coordinates daily parcel movement.',
    systemKey: null,
    permissions: ['items.view'],
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'tmem_alejandra',
    tenantId: 'ten_rocketship',
    userId: 'usr_alejandra',
    roleId: 'role_dispatcher',
    status: 'ACTIVE',
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createMemberWithRole(
  memberOverrides: Partial<TeamMember> = {},
  roleOverrides: Partial<Role> = {}
) {
  return {
    ...createMember(memberOverrides),
    role: createRole(roleOverrides),
  }
}

describe('service.team', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-21T12:00:00Z'))
    mockPrismaRef.current = {
      role: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      teamMember: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists serialized team grants in creation order', async () => {
    const findMany = mockPrismaRef.current!.teamMember.findMany
    findMany.mockResolvedValue([
      createMemberWithRole(),
      createMemberWithRole(
        {
          id: 'tmem_malik',
          userId: 'usr_malik',
          roleId: 'role_staff',
          status: 'INACTIVE',
        },
        { id: 'role_staff', name: 'Staff', systemKey: 'staff' }
      ),
    ])

    const result = await team.list('ten_rocketship')

    expect(result).toEqual([
      {
        id: 'tmem_alejandra',
        userId: 'usr_alejandra',
        roleId: 'role_dispatcher',
        roleName: 'Dispatcher',
        roleSystemKey: null,
        status: 'active',
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
      {
        id: 'tmem_malik',
        userId: 'usr_malik',
        roleId: 'role_staff',
        roleName: 'Staff',
        roleSystemKey: 'staff',
        status: 'inactive',
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
    ])
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_rocketship' },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('filters team grants by status in the database query', async () => {
    const findMany = mockPrismaRef.current!.teamMember.findMany

    await team.list('ten_rocketship', { status: 'inactive' })

    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_rocketship', status: 'INACTIVE' },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('retrieves and serializes a team grant by ID', async () => {
    const findFirst = mockPrismaRef.current!.teamMember.findFirst
    findFirst.mockResolvedValue(createMemberWithRole())

    const result = await team.retrieve('ten_rocketship', 'tmem_alejandra')

    expect(result).toEqual({
      id: 'tmem_alejandra',
      userId: 'usr_alejandra',
      roleId: 'role_dispatcher',
      roleName: 'Dispatcher',
      roleSystemKey: null,
      status: 'active',
      createdAt: 1_784_419_200,
      updatedAt: 1_784_419_200,
    })
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'tmem_alejandra', tenantId: 'ten_rocketship' },
      include: { role: true },
    })
  })

  it('returns null when a team grant does not exist', async () => {
    const findFirst = mockPrismaRef.current!.teamMember.findFirst

    const result = await team.retrieve('ten_rocketship', 'tmem_missing')

    expect(result).toBeNull()
    expect(findFirst).toHaveBeenCalledTimes(1)
  })

  it('creates an active team grant for a tenant role', async () => {
    const roleFindFirst = mockPrismaRef.current!.role.findFirst
    const create = mockPrismaRef.current!.teamMember.create
    roleFindFirst.mockResolvedValue({ id: 'role_dispatcher' })
    create.mockResolvedValue(
      createMemberWithRole({ createdAt: NOW, updatedAt: NOW })
    )

    const result = await team.create('ten_rocketship', {
      userId: 'usr_alejandra',
      roleId: 'role_dispatcher',
    })

    expect(result).toEqual({
      data: {
        id: 'tmem_alejandra',
        userId: 'usr_alejandra',
        roleId: 'role_dispatcher',
        roleName: 'Dispatcher',
        roleSystemKey: null,
        status: 'active',
        createdAt: NOW,
        updatedAt: NOW,
      },
      error: null,
    })
    expect(roleFindFirst).toHaveBeenCalledTimes(1)
    expect(roleFindFirst).toHaveBeenCalledWith({
      where: { id: 'role_dispatcher', tenantId: 'ten_rocketship' },
      select: { id: true },
    })
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_rocketship',
        userId: 'usr_alejandra',
        roleId: 'role_dispatcher',
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
      },
      include: { role: true },
    })
  })

  it('rejects assignment to a role from another tenant', async () => {
    const create = mockPrismaRef.current!.teamMember.create

    const result = await team.create('ten_rocketship', {
      userId: 'usr_alejandra',
      roleId: 'role_other_tenant',
    })

    expect(result).toEqual({
      data: null,
      error: 'The selected role is not available for this tenant.',
      status: 400,
      code: 'team/role-not-found',
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('maps a duplicate user grant to the already-member conflict', async () => {
    const roleFindFirst = mockPrismaRef.current!.role.findFirst
    const create = mockPrismaRef.current!.teamMember.create
    roleFindFirst.mockResolvedValue({ id: 'role_dispatcher' })
    create.mockRejectedValue({ code: 'P2002' })

    const result = await team.create('ten_rocketship', {
      userId: 'usr_alejandra',
      roleId: 'role_dispatcher',
    })

    expect(result).toEqual({
      data: null,
      error: 'This user is already a team member.',
      status: 409,
      code: 'team/already-member',
    })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('returns an existing grant unchanged during idempotent ensure', async () => {
    const findUnique = mockPrismaRef.current!.teamMember.findUnique
    const roleCreate = mockPrismaRef.current!.role.create
    const create = mockPrismaRef.current!.teamMember.create
    findUnique.mockResolvedValue(
      createMemberWithRole(
        { roleId: 'role_admin' },
        { id: 'role_admin', name: 'Admin', systemKey: 'admin' }
      )
    )

    const result = await team.ensure('ten_rocketship', {
      userId: 'usr_alejandra',
      systemKey: 'admin',
    })

    expect(result).toEqual({
      data: {
        id: 'tmem_alejandra',
        userId: 'usr_alejandra',
        roleId: 'role_admin',
        roleName: 'Admin',
        roleSystemKey: 'admin',
        status: 'active',
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
      error: null,
    })
    expect(roleCreate).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('provisions defaults and creates the requested default grant during ensure', async () => {
    const roleFindUnique = mockPrismaRef.current!.role.findUnique
    const roleFindMany = mockPrismaRef.current!.role.findMany
    const roleCreate = mockPrismaRef.current!.role.create
    const create = mockPrismaRef.current!.teamMember.create
    roleFindMany.mockResolvedValue([])
    roleFindUnique.mockResolvedValue({ id: 'role_staff' })
    create.mockResolvedValue(
      createMemberWithRole(
        {
          roleId: 'role_staff',
          createdAt: NOW,
          updatedAt: NOW,
        },
        { id: 'role_staff', name: 'Staff', systemKey: 'staff' }
      )
    )

    const result = await team.ensure('ten_rocketship', {
      userId: 'usr_alejandra',
      systemKey: 'staff',
    })

    expect(result).toEqual({
      data: {
        id: 'tmem_alejandra',
        userId: 'usr_alejandra',
        roleId: 'role_staff',
        roleName: 'Staff',
        roleSystemKey: 'staff',
        status: 'active',
        createdAt: NOW,
        updatedAt: NOW,
      },
      error: null,
    })
    expect(roleCreate).toHaveBeenCalledTimes(2)
    expect(roleFindUnique).toHaveBeenCalledTimes(1)
    expect(roleFindUnique).toHaveBeenCalledWith({
      where: {
        roles_tenant_id_system_key_key: {
          tenantId: 'ten_rocketship',
          systemKey: 'staff',
        },
      },
      select: { id: true },
    })
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_rocketship',
        userId: 'usr_alejandra',
        roleId: 'role_staff',
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
      },
      include: { role: true },
    })
  })

  it('updates role and status while serializing the lowercase boundary value', async () => {
    const memberFindFirst = mockPrismaRef.current!.teamMember.findFirst
    const roleFindFirst = mockPrismaRef.current!.role.findFirst
    const count = mockPrismaRef.current!.teamMember.count
    const update = mockPrismaRef.current!.teamMember.update
    memberFindFirst.mockResolvedValue(createMemberWithRole())
    roleFindFirst.mockResolvedValue(
      createRole({ id: 'role_warehouse', name: 'Warehouse Agent' })
    )
    update.mockResolvedValue(
      createMemberWithRole(
        {
          roleId: 'role_warehouse',
          status: 'INACTIVE',
          updatedAt: NOW,
        },
        { id: 'role_warehouse', name: 'Warehouse Agent' }
      )
    )

    const result = await team.update('ten_rocketship', 'tmem_alejandra', {
      roleId: 'role_warehouse',
      status: 'inactive',
    })

    expect(result).toEqual({
      data: {
        id: 'tmem_alejandra',
        userId: 'usr_alejandra',
        roleId: 'role_warehouse',
        roleName: 'Warehouse Agent',
        roleSystemKey: null,
        status: 'inactive',
        createdAt: 1_784_419_200,
        updatedAt: NOW,
      },
      error: null,
    })
    expect(count).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      where: { id: 'tmem_alejandra' },
      data: {
        roleId: 'role_warehouse',
        status: 'INACTIVE',
        updatedAt: NOW,
      },
      include: { role: true },
    })
  })

  it('blocks re-roling the last active Admin member', async () => {
    const memberFindFirst = mockPrismaRef.current!.teamMember.findFirst
    const roleFindFirst = mockPrismaRef.current!.role.findFirst
    const count = mockPrismaRef.current!.teamMember.count
    const update = mockPrismaRef.current!.teamMember.update
    memberFindFirst.mockResolvedValue(
      createMemberWithRole(
        { roleId: 'role_admin' },
        { id: 'role_admin', name: 'Admin', systemKey: 'admin' }
      )
    )
    roleFindFirst.mockResolvedValue(
      createRole({ id: 'role_staff', name: 'Staff', systemKey: 'staff' })
    )
    count.mockResolvedValue(1)

    const result = await team.update('ten_rocketship', 'tmem_alejandra', {
      roleId: 'role_staff',
    })

    expect(result).toEqual({
      data: null,
      error:
        'The last active Admin team member cannot be removed or reassigned.',
      status: 400,
      code: 'team/last-active-admin',
    })
    expect(count).toHaveBeenCalledTimes(1)
    expect(count).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_rocketship',
        status: 'ACTIVE',
        role: { systemKey: 'admin' },
      },
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('blocks deactivating the last active Admin member', async () => {
    const memberFindFirst = mockPrismaRef.current!.teamMember.findFirst
    const count = mockPrismaRef.current!.teamMember.count
    const update = mockPrismaRef.current!.teamMember.update
    memberFindFirst.mockResolvedValue(
      createMemberWithRole(
        { roleId: 'role_admin' },
        { id: 'role_admin', name: 'Admin', systemKey: 'admin' }
      )
    )
    count.mockResolvedValue(1)

    const result = await team.update('ten_rocketship', 'tmem_alejandra', {
      status: 'inactive',
    })

    expect(result).toEqual({
      data: null,
      error:
        'The last active Admin team member cannot be removed or reassigned.',
      status: 400,
      code: 'team/last-active-admin',
    })
    expect(count).toHaveBeenCalledTimes(1)
    expect(update).not.toHaveBeenCalled()
  })

  it('blocks deleting the last active Admin member', async () => {
    const findFirst = mockPrismaRef.current!.teamMember.findFirst
    const count = mockPrismaRef.current!.teamMember.count
    const deleteMember = mockPrismaRef.current!.teamMember.delete
    findFirst.mockResolvedValue(
      createMemberWithRole(
        { roleId: 'role_admin' },
        { id: 'role_admin', name: 'Admin', systemKey: 'admin' }
      )
    )
    count.mockResolvedValue(1)

    const result = await team.delete('ten_rocketship', 'tmem_alejandra')

    expect(result).toEqual({
      data: null,
      error:
        'The last active Admin team member cannot be removed or reassigned.',
      status: 400,
      code: 'team/last-active-admin',
    })
    expect(count).toHaveBeenCalledTimes(1)
    expect(deleteMember).not.toHaveBeenCalled()
  })

  it('deletes a non-Admin grant and returns its tombstone', async () => {
    const findFirst = mockPrismaRef.current!.teamMember.findFirst
    const count = mockPrismaRef.current!.teamMember.count
    const deleteMember = mockPrismaRef.current!.teamMember.delete
    findFirst.mockResolvedValue(createMemberWithRole())
    deleteMember.mockResolvedValue(createMember())

    const result = await team.delete('ten_rocketship', 'tmem_alejandra')

    expect(result).toEqual({
      data: { id: 'tmem_alejandra', deleted: true },
      error: null,
    })
    expect(count).not.toHaveBeenCalled()
    expect(deleteMember).toHaveBeenCalledTimes(1)
    expect(deleteMember).toHaveBeenCalledWith({
      where: { id: 'tmem_alejandra' },
    })
  })
})

it('filters team grants by active status in the database query', async () => {
  const findMany = mockPrismaRef.current!.teamMember.findMany

  await team.list('ten_rocketship', { status: 'active' })

  expect(findMany).toHaveBeenCalledWith({
    where: { tenantId: 'ten_rocketship', status: 'ACTIVE' },
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  })
})

it('returns not-found when updating a missing team grant', async () => {
  const findFirst = mockPrismaRef.current!.teamMember.findFirst
  const update = mockPrismaRef.current!.teamMember.update
  findFirst.mockResolvedValue(null)

  const result = await team.update('ten_rocketship', 'tmem_missing', {
    status: 'inactive',
  })

  expect(result).toEqual({
    data: null,
    error: 'The requested team member was not found.',
    status: 404,
    code: 'team/not-found',
  })
  expect(update).not.toHaveBeenCalled()
})

it('rejects update assignment to a role from another tenant', async () => {
  const memberFindFirst = mockPrismaRef.current!.teamMember.findFirst
  const roleFindFirst = mockPrismaRef.current!.role.findFirst
  const update = mockPrismaRef.current!.teamMember.update
  memberFindFirst.mockResolvedValue(createMemberWithRole())
  roleFindFirst.mockResolvedValue(null)

  const result = await team.update('ten_rocketship', 'tmem_alejandra', {
    roleId: 'role_other_tenant',
  })

  expect(result).toEqual({
    data: null,
    error: 'The selected role is not available for this tenant.',
    status: 400,
    code: 'team/role-not-found',
  })
  expect(update).not.toHaveBeenCalled()
})

it('allows re-roling an Admin when another active Admin remains', async () => {
  const memberFindFirst = mockPrismaRef.current!.teamMember.findFirst
  const roleFindFirst = mockPrismaRef.current!.role.findFirst
  const count = mockPrismaRef.current!.teamMember.count
  const update = mockPrismaRef.current!.teamMember.update
  memberFindFirst.mockResolvedValue(
    createMemberWithRole(
      { roleId: 'role_admin' },
      { id: 'role_admin', name: 'Admin', systemKey: 'admin' }
    )
  )
  roleFindFirst.mockResolvedValue(
    createRole({ id: 'role_staff', name: 'Staff', systemKey: 'staff' })
  )
  count.mockResolvedValue(2)
  update.mockResolvedValue(
    createMemberWithRole(
      {
        roleId: 'role_staff',
        updatedAt: NOW,
      },
      { id: 'role_staff', name: 'Staff', systemKey: 'staff' }
    )
  )

  const result = await team.update('ten_rocketship', 'tmem_alejandra', {
    roleId: 'role_staff',
  })

  expect(result.error).toBeNull()
  expect(result.data?.roleSystemKey).toBe('staff')
  expect(count).toHaveBeenCalledTimes(1)
  expect(update).toHaveBeenCalledTimes(1)
})

it('returns not-found when deleting a missing team grant', async () => {
  const findFirst = mockPrismaRef.current!.teamMember.findFirst
  const deleteMember = mockPrismaRef.current!.teamMember.delete
  findFirst.mockResolvedValue(null)

  const result = await team.delete('ten_rocketship', 'tmem_missing')

  expect(result).toEqual({
    data: null,
    error: 'The requested team member was not found.',
    status: 404,
    code: 'team/not-found',
  })
  expect(deleteMember).not.toHaveBeenCalled()
})

it('returns role-not-found when ensure cannot resolve the default role', async () => {
  const roleFindMany = mockPrismaRef.current!.role.findMany
  const roleFindUnique = mockPrismaRef.current!.role.findUnique
  const create = mockPrismaRef.current!.teamMember.create
  roleFindMany.mockResolvedValue([
    { systemKey: 'admin' },
    { systemKey: 'staff' },
  ])
  roleFindUnique.mockResolvedValue(null)

  const result = await team.ensure('ten_rocketship', {
    userId: 'usr_alejandra',
    systemKey: 'admin',
  })

  expect(result).toEqual({
    data: null,
    error: 'The selected role is not available for this tenant.',
    status: 400,
    code: 'team/role-not-found',
  })
  expect(create).not.toHaveBeenCalled()
})

it('maps a concurrent ensure race to already-member conflict', async () => {
  const roleFindMany = mockPrismaRef.current!.role.findMany
  const roleFindUnique = mockPrismaRef.current!.role.findUnique
  const create = mockPrismaRef.current!.teamMember.create
  roleFindMany.mockResolvedValue([
    { systemKey: 'admin' },
    { systemKey: 'staff' },
  ])
  roleFindUnique.mockResolvedValue({ id: 'role_admin' })
  create.mockRejectedValue({ code: 'P2002' })

  const result = await team.ensure('ten_rocketship', {
    userId: 'usr_alejandra',
    systemKey: 'admin',
  })

  expect(result).toEqual({
    data: null,
    error: 'This user is already a team member.',
    status: 409,
    code: 'team/already-member',
  })
})

it('allows deleting a non-last Admin when another active Admin remains', async () => {
  const findFirst = mockPrismaRef.current!.teamMember.findFirst
  const count = mockPrismaRef.current!.teamMember.count
  const deleteMember = mockPrismaRef.current!.teamMember.delete
  findFirst.mockResolvedValue(
    createMemberWithRole(
      { roleId: 'role_admin' },
      { id: 'role_admin', name: 'Admin', systemKey: 'admin' }
    )
  )
  count.mockResolvedValue(2)
  deleteMember.mockResolvedValue(createMember({ roleId: 'role_admin' }))

  const result = await team.delete('ten_rocketship', 'tmem_alejandra')

  expect(result).toEqual({
    data: { id: 'tmem_alejandra', deleted: true },
    error: null,
  })
  expect(count).toHaveBeenCalledTimes(1)
  expect(deleteMember).toHaveBeenCalledTimes(1)
})
