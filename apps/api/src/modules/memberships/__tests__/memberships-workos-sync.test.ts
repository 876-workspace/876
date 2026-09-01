import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, linkMembershipRole, assignMemberApps } = vi.hoisted(() => ({
  repository: {
    findMembershipByWorkosId: vi.fn(),
    updateMembership: vi.fn(),
    createMembership: vi.fn(),
    deleteMembership: vi.fn(),
  },
  linkMembershipRole: vi.fn(),
  assignMemberApps: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {},
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))
vi.mock('../memberships.repository', () => repository)
vi.mock('@/platform/ids', () => ({
  generateId: vi.fn(() => 'mem_generated'),
}))
vi.mock('@/services/provisioning', () => ({
  BILLING_APP_SLUG: '876-billing',
  linkMembershipRole,
  assignMemberApps,
}))

const { upsertMembershipFromWorkos, removeMembershipByWorkosId } =
  await import('../memberships.service')

const NOW = 1_785_000_000

function membershipRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem_1',
    organizationId: 'org_1',
    userId: 'user_1',
    workosMembershipId: 'om_1',
    role: 'dispatcher',
    roleId: 'role_dispatcher',
    status: 'active',
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW - 100),
    ...overrides,
  }
}

describe('upsertMembershipFromWorkos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW * 1000)
    linkMembershipRole.mockResolvedValue(undefined)
    assignMemberApps.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates lifecycle status without collapsing an existing richer local role', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(membershipRow())
    repository.updateMembership.mockResolvedValue(
      membershipRow({ status: 'active', updatedAt: BigInt(NOW) })
    )

    const action = await upsertMembershipFromWorkos({
      workosMembershipId: 'om_1',
      organizationId: 'org_1',
      userId: 'user_1',
      role: 'staff',
      status: 'active',
    })

    expect(action).toBe('updated')
    expect(repository.updateMembership).toHaveBeenCalledWith('mem_1', {
      status: 'active',
      updatedAt: BigInt(NOW),
    })
    expect(linkMembershipRole).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mem_1',
        role: 'dispatcher',
        roleId: 'role_dispatcher',
      }),
      NOW
    )
    expect(assignMemberApps).toHaveBeenCalledWith({
      organizationId: 'org_1',
      userId: 'user_1',
      now: NOW,
    })
    expect(repository.createMembership).not.toHaveBeenCalled()
  })

  it('initializes a provider admin membership as local admin, never super admin', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(null)
    repository.createMembership.mockResolvedValue(
      membershipRow({
        id: 'mem_generated',
        organizationId: 'org_2',
        userId: 'user_2',
        workosMembershipId: 'om_2',
        role: 'admin',
        roleId: null,
        createdAt: BigInt(NOW),
        updatedAt: BigInt(NOW),
      })
    )

    const action = await upsertMembershipFromWorkos({
      workosMembershipId: 'om_2',
      organizationId: 'org_2',
      userId: 'user_2',
      role: 'admin',
      status: 'active',
    })

    expect(action).toBe('created')
    expect(repository.createMembership).toHaveBeenCalledWith({
      id: 'mem_generated',
      organizationId: 'org_2',
      userId: 'user_2',
      workosMembershipId: 'om_2',
      role: 'admin',
      status: 'active',
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    })
    expect(linkMembershipRole).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mem_generated', role: 'admin' }),
      NOW
    )
  })

  it('initializes non-admin provider roles as local member', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(null)
    repository.createMembership.mockResolvedValue(
      membershipRow({
        id: 'mem_generated',
        organizationId: 'org_2',
        userId: 'user_2',
        workosMembershipId: 'om_2',
        role: 'staff',
        roleId: null,
        createdAt: BigInt(NOW),
        updatedAt: BigInt(NOW),
      })
    )

    const action = await upsertMembershipFromWorkos({
      workosMembershipId: 'om_2',
      organizationId: 'org_2',
      userId: 'user_2',
      role: 'staff',
      status: 'active',
    })

    expect(action).toBe('created')
    expect(repository.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'staff' })
    )
  })

  it('does not auto-assign apps for a non-active provider membership', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(
      membershipRow({ status: 'pending' })
    )
    repository.updateMembership.mockResolvedValue(
      membershipRow({ status: 'pending', updatedAt: BigInt(NOW) })
    )

    await upsertMembershipFromWorkos({
      workosMembershipId: 'om_1',
      organizationId: 'org_1',
      userId: 'user_1',
      role: 'staff',
      status: 'pending',
    })

    expect(assignMemberApps).not.toHaveBeenCalled()
  })

  it('skips creation when the local org or user cannot be resolved', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(null)

    const action = await upsertMembershipFromWorkos({
      workosMembershipId: 'om_3',
      organizationId: null,
      userId: 'user_3',
      role: 'staff',
      status: 'active',
    })

    expect(action).toBe('skipped')
    expect(repository.createMembership).not.toHaveBeenCalled()
    expect(repository.updateMembership).not.toHaveBeenCalled()
  })
})

describe('removeMembershipByWorkosId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('soft-deletes the membership matched by WorkOS id and marks it removed', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(membershipRow())
    repository.deleteMembership.mockResolvedValue(true)

    const result = await removeMembershipByWorkosId('om_1')

    expect(result).toBe(true)
    expect(repository.deleteMembership).toHaveBeenCalledWith('mem_1', {
      status: 'removed',
    })
  })

  it('returns false when no membership matches', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(null)

    const result = await removeMembershipByWorkosId('om_absent')

    expect(result).toBe(false)
    expect(repository.deleteMembership).not.toHaveBeenCalled()
  })
})
