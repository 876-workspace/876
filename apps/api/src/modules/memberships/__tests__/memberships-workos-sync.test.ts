import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { repository } = vi.hoisted(() => ({
  repository: {
    findMembershipByWorkosId: vi.fn(),
    updateMembership: vi.fn(),
    createMembership: vi.fn(),
    deleteMembership: vi.fn(),
  },
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

const { upsertMembershipFromWorkos, removeMembershipByWorkosId } =
  await import('../memberships.service')

const NOW = 1_785_000_000

describe('upsertMembershipFromWorkos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW * 1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates role/status on an existing membership matched by WorkOS id', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue({ id: 'mem_1' })

    const action = await upsertMembershipFromWorkos({
      workosMembershipId: 'om_1',
      organizationId: 'org_1',
      userId: 'user_1',
      role: 'admin',
      status: 'active',
    })

    expect(action).toBe('updated')
    expect(repository.updateMembership).toHaveBeenCalledWith('mem_1', {
      role: 'admin',
      status: 'active',
      updatedAt: BigInt(NOW),
    })
    expect(repository.createMembership).not.toHaveBeenCalled()
  })

  it('creates a membership when none exists and org and user resolve', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(null)

    const action = await upsertMembershipFromWorkos({
      workosMembershipId: 'om_2',
      organizationId: 'org_2',
      userId: 'user_2',
      role: 'member',
      status: 'active',
    })

    expect(action).toBe('created')
    expect(repository.createMembership).toHaveBeenCalledWith({
      id: 'mem_generated',
      organizationId: 'org_2',
      userId: 'user_2',
      workosMembershipId: 'om_2',
      role: 'member',
      status: 'active',
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    })
    expect(repository.updateMembership).not.toHaveBeenCalled()
  })

  it('skips creation when the local org or user cannot be resolved', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(null)

    const action = await upsertMembershipFromWorkos({
      workosMembershipId: 'om_3',
      organizationId: null,
      userId: 'user_3',
      role: 'member',
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

  it('soft-deletes the membership matched by WorkOS id', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue({ id: 'mem_9' })
    repository.deleteMembership.mockResolvedValue(true)

    const result = await removeMembershipByWorkosId('om_9')

    expect(result).toBe(true)
    expect(repository.deleteMembership).toHaveBeenCalledWith('mem_9')
  })

  it('returns false when no membership matches', async () => {
    repository.findMembershipByWorkosId.mockResolvedValue(null)

    const result = await removeMembershipByWorkosId('om_absent')

    expect(result).toBe(false)
    expect(repository.deleteMembership).not.toHaveBeenCalled()
  })
})
