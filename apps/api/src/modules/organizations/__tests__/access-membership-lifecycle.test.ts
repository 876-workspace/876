import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMembershipById: vi.fn(),
  deleteMembership: vi.fn(),
}))

vi.mock('@/modules/memberships', () => ({
  deleteMembership: mocks.deleteMembership,
}))

vi.mock('../access.repository', () => ({
  findMembershipById: mocks.findMembershipById,
}))

const { deleteOrgMember } = await import('../access.service')

describe('organization member lifecycle delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findMembershipById.mockResolvedValue({
      id: 'mem_target',
      organizationId: 'org_target',
      userId: 'user_target',
      role: 'member',
      status: 'active',
    })
    mocks.deleteMembership.mockResolvedValue({
      object: 'membership',
      id: 'mem_target',
      deleted: true,
    })
  })

  it('keeps org scoping but delegates deletion to the canonical membership lifecycle', async () => {
    const result = await deleteOrgMember('org_target', 'mem_target', {
      internal: true,
      userId: 'user_console_admin',
    })

    expect(result).toEqual({
      object: 'organization_member',
      id: 'mem_target',
      deleted: true,
    })
    expect(mocks.deleteMembership).toHaveBeenCalledWith('mem_target', {
      status: 'removed',
      deletedBy: 'user_console_admin',
      deletedAt: expect.any(BigInt),
    })
  })

  it('does not invoke the lifecycle for a membership from another organization', async () => {
    mocks.findMembershipById.mockResolvedValue({
      id: 'mem_target',
      organizationId: 'org_other',
      userId: 'user_target',
      role: 'member',
      status: 'active',
    })

    await expect(
      deleteOrgMember('org_target', 'mem_target', {
        internal: true,
        userId: 'user_console_admin',
      })
    ).rejects.toMatchObject({ code: 'membership/not-found' })

    expect(mocks.deleteMembership).not.toHaveBeenCalled()
  })
})
