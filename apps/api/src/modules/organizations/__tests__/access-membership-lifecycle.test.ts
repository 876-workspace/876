import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMembershipById: vi.fn(),
  findMembershipByIdWithUser: vi.fn(),
  findRoleByName: vi.fn(),
  updateMembership: vi.fn(),
  deleteMembership: vi.fn(),
}))

vi.mock('@/modules/memberships', () => ({
  updateMembership: mocks.updateMembership,
  deleteMembership: mocks.deleteMembership,
}))

vi.mock('../access.repository', () => ({
  findMembershipById: mocks.findMembershipById,
  findMembershipByIdWithUser: mocks.findMembershipByIdWithUser,
  findRoleByName: mocks.findRoleByName,
}))

const { deleteOrgMember, updateOrgMemberRole } =
  await import('../access.service')

const member = (overrides: Record<string, unknown> = {}) => ({
  id: 'mem_target',
  organizationId: 'org_target',
  userId: 'user_target',
  role: 'staff',
  roleId: 'role_member',
  status: 'active',
  createdAt: 1_785_000_000n,
  user: {
    firstName: 'Test',
    lastName: 'Member',
    email: 'member@example.com',
    avatar: null,
  },
  ...overrides,
})

describe('organization member lifecycle delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findMembershipById.mockResolvedValue(member())
    mocks.findMembershipByIdWithUser.mockResolvedValue(member())
    mocks.findRoleByName.mockResolvedValue({
      id: 'role_admin',
      name: 'admin',
    })
    mocks.updateMembership.mockResolvedValue({
      object: 'membership',
      id: 'mem_target',
      role: 'admin',
    })
    mocks.deleteMembership.mockResolvedValue({
      object: 'membership',
      id: 'mem_target',
      deleted: true,
    })
  })

  it('keeps org invariants but delegates role writes to the canonical membership lifecycle', async () => {
    mocks.findMembershipByIdWithUser
      .mockResolvedValueOnce(member())
      .mockResolvedValueOnce(member({ role: 'admin', roleId: 'role_admin' }))

    const result = await updateOrgMemberRole(
      'org_target',
      'mem_target',
      { role: 'admin' },
      { internal: true, userId: 'user_console_admin' }
    )

    expect(mocks.updateMembership).toHaveBeenCalledWith('mem_target', {
      role: 'admin',
    })
    expect(result).toMatchObject({
      object: 'organization_member',
      id: 'mem_target',
      role: 'admin',
      role_id: 'role_admin',
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
      deletedAt: expect.anything(),
    })
    const options = mocks.deleteMembership.mock.calls[0]?.[1]
    expect(typeof options?.deletedAt).toBe('bigint')
  })

  it('does not invoke the lifecycle for a membership from another organization', async () => {
    mocks.findMembershipById.mockResolvedValue(
      member({ organizationId: 'org_other' })
    )

    await expect(
      deleteOrgMember('org_target', 'mem_target', {
        internal: true,
        userId: 'user_console_admin',
      })
    ).rejects.toMatchObject({ code: 'membership/not-found' })

    expect(mocks.deleteMembership).not.toHaveBeenCalled()
  })
})
