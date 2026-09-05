import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { disconnectDb, prisma } = vi.hoisted(() => ({
  disconnectDb: vi.fn(),
  prisma: {
    appAssignment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    appRole: {
      findMany: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/db/client', () => ({ disconnectDb, prisma }))

const originalArgv = [...process.argv]

const assignment = {
  id: 'asg_1',
  organizationId: 'org_1',
  userId: 'user_1',
  appId: 'app_projects',
  appRoleId: 'role_staff',
  user: {
    memberships: [{ organizationId: 'org_1', role: 'super_admin' }],
  },
}

const roles = [
  {
    id: 'role_staff',
    key: 'staff',
    isDefault: true,
    deletedAt: null,
  },
  {
    id: 'role_super',
    key: 'super-admin',
    isDefault: false,
    deletedAt: null,
  },
]

const roleQuery = {
  where: {
    organizationId: 'org_1',
    appId: 'app_projects',
    deletedAt: null,
  },
  orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { id: 'asc' }],
  select: { id: true, key: true, isDefault: true, deletedAt: true },
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  process.argv = [
    originalArgv[0] ?? 'node',
    'backfill-app-assignment-roles',
    '--apply',
  ]
  prisma.appAssignment.findMany.mockResolvedValue([assignment])
  prisma.appRole.findMany.mockResolvedValue(roles)
  prisma.membership.findFirst.mockResolvedValue({ id: 'membership_1' })
  prisma.appAssignment.updateMany.mockResolvedValue({ count: 1 })
  disconnectDb.mockResolvedValue(undefined)
})

afterEach(() => {
  process.argv = [...originalArgv]
  vi.restoreAllMocks()
})

async function runScript() {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  await import('../../../scripts/backfill-app-assignment-roles')
  const output = log.mock.calls.at(-1)?.[0]
  expect(typeof output).toBe('string')
  return JSON.parse(output as string) as {
    dryRun: boolean
    changed: number
    skippedAfterDiscovery: number
    candidates: Array<Record<string, string>>
  }
}

describe('app assignment role backfill script', () => {
  it('defaults to dry-run and performs no writes even when candidates exist', async () => {
    process.argv = [originalArgv[0] ?? 'node', 'backfill-app-assignment-roles']

    const output = await runScript()

    expect(prisma.membership.findFirst).not.toHaveBeenCalled()
    expect(prisma.appRole.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.appAssignment.updateMany).not.toHaveBeenCalled()
    expect(output).toMatchObject({
      dryRun: true,
      changed: 0,
      skippedAfterDiscovery: 0,
      candidates: [
        {
          assignmentId: 'asg_1',
          organizationId: 'org_1',
          userId: 'user_1',
          appId: 'app_projects',
          fromRoleId: 'role_staff',
          toRoleId: 'role_super',
          organizationRole: 'super_admin',
        },
      ],
    })
  })

  it('re-resolves the current role set and compare-and-sets the original assignment before applying', async () => {
    const output = await runScript()

    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org_1',
        userId: 'user_1',
        role: 'super_admin',
        status: 'active',
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(prisma.appRole.findMany).toHaveBeenCalledTimes(2)
    expect(prisma.appRole.findMany).toHaveBeenLastCalledWith(roleQuery)
    expect(prisma.appAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'asg_1',
        organizationId: 'org_1',
        userId: 'user_1',
        appId: 'app_projects',
        appRoleId: 'role_staff',
        status: 'active',
        deletedAt: null,
        revokedAt: null,
        appRole: { is: { isDefault: true, deletedAt: null } },
      },
      data: { appRoleId: 'role_super' },
    })
    expect(output).toMatchObject({
      dryRun: false,
      changed: 1,
      skippedAfterDiscovery: 0,
      candidates: [
        {
          assignmentId: 'asg_1',
          organizationId: 'org_1',
          userId: 'user_1',
          appId: 'app_projects',
          fromRoleId: 'role_staff',
          toRoleId: 'role_super',
          organizationRole: 'super_admin',
        },
      ],
    })
  })

  it('skips a stale candidate when the organization role changed after discovery', async () => {
    prisma.membership.findFirst.mockResolvedValue(null)

    const output = await runScript()

    expect(prisma.appAssignment.updateMany).not.toHaveBeenCalled()
    expect(output).toMatchObject({
      dryRun: false,
      changed: 0,
      skippedAfterDiscovery: 1,
    })
  })

  it('skips a stale candidate when fresh role resolution no longer selects the discovered target', async () => {
    prisma.appRole.findMany
      .mockResolvedValueOnce(roles)
      .mockResolvedValueOnce([roles[0]])

    const output = await runScript()

    expect(prisma.membership.findFirst).toHaveBeenCalledTimes(1)
    expect(prisma.appAssignment.updateMany).not.toHaveBeenCalled()
    expect(output).toMatchObject({
      dryRun: false,
      changed: 0,
      skippedAfterDiscovery: 1,
    })
  })
})
