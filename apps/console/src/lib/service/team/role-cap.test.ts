import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createMember: vi.fn(),
  findMember: vi.fn(),
  updateMember: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    member: {
      create: mocks.createMember,
      findUnique: mocks.findMember,
      update: mocks.updateMember,
    },
  },
}))

import { create } from './create'
import { update } from './update'

const future = 4_000_000_000n
const nonStaff = {
  title: 'Consultant',
  expiresAt: future,
  justification: 'Bounded engagement',
}

function existing(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user_operator',
    roleName: 'admin',
    status: 'active',
    affiliation: 'staff',
    title: null,
    expiresAt: null,
    justification: null,
    invitedBy: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createMember.mockImplementation(async ({ data }) => data)
  mocks.updateMember.mockImplementation(async ({ data }) => data)
  mocks.findMember.mockResolvedValue(existing())
})

describe('Console affiliation role cap', () => {
  it('allows creating an owner grant for staff', async () => {
    const result = await create('user_operator', 'owner', { affiliation: 'staff' })
    expect(result.error).toBeNull()
    expect(mocks.createMember).toHaveBeenCalledTimes(1)
  })

  it('allows creating a super_admin grant for staff', async () => {
    const result = await create('user_operator', 'super_admin', {
      affiliation: 'staff',
    })
    expect(result.error).toBeNull()
    expect(mocks.createMember).toHaveBeenCalledTimes(1)
  })

  it('allows creating an admin grant for a contractor', async () => {
    const result = await create('user_operator', 'admin', {
      affiliation: 'contractor',
      ...nonStaff,
    })
    expect(result.error).toBeNull()
    expect(mocks.createMember).toHaveBeenCalledTimes(1)
  })

  it('rejects creating an owner grant for a contractor', async () => {
    const result = await create('user_operator', 'owner', {
      affiliation: 'contractor',
      ...nonStaff,
    })
    expect(result).toEqual({
      data: null,
      error: {
        code: 'team/role-not-allowed-for-affiliation',
        message: 'Role "owner" is not allowed for affiliation "contractor".',
      },
    })
    expect(mocks.createMember).not.toHaveBeenCalled()
  })

  it('rejects creating a super_admin grant for an external operator', async () => {
    const result = await create('user_operator', 'super_admin', {
      affiliation: 'external',
      ...nonStaff,
    })
    expect(result).toEqual({
      data: null,
      error: {
        code: 'team/role-not-allowed-for-affiliation',
        message: 'Role "super_admin" is not allowed for affiliation "external".',
      },
    })
    expect(mocks.createMember).not.toHaveBeenCalled()
  })

  it('rejects promoting an existing contractor to owner', async () => {
    mocks.findMember.mockResolvedValue(
      existing({ affiliation: 'contractor', ...nonStaff })
    )
    const result = await update('user_operator', { roleName: 'owner' })
    expect(result.error?.code).toBe('team/role-not-allowed-for-affiliation')
    expect(mocks.updateMember).not.toHaveBeenCalled()
  })

  it('rejects promoting an existing external operator to super_admin', async () => {
    mocks.findMember.mockResolvedValue(
      existing({ affiliation: 'external', ...nonStaff })
    )
    const result = await update('user_operator', { roleName: 'super_admin' })
    expect(result.error?.code).toBe('team/role-not-allowed-for-affiliation')
    expect(mocks.updateMember).not.toHaveBeenCalled()
  })

  it('rejects changing an owner from staff to contractor without demotion', async () => {
    mocks.findMember.mockResolvedValue(existing({ roleName: 'owner' }))
    const result = await update('user_operator', {
      affiliation: 'contractor',
      ...nonStaff,
    })
    expect(result.error?.code).toBe('team/role-not-allowed-for-affiliation')
    expect(mocks.updateMember).not.toHaveBeenCalled()
  })

  it('rejects changing a super_admin from staff to external without demotion', async () => {
    mocks.findMember.mockResolvedValue(existing({ roleName: 'super_admin' }))
    const result = await update('user_operator', {
      affiliation: 'external',
      ...nonStaff,
    })
    expect(result.error?.code).toBe('team/role-not-allowed-for-affiliation')
    expect(mocks.updateMember).not.toHaveBeenCalled()
  })

  it('allows updating a contractor while the resulting role remains admin', async () => {
    mocks.findMember.mockResolvedValue(
      existing({ affiliation: 'contractor', ...nonStaff })
    )
    const result = await update('user_operator', { title: 'Senior Consultant' })
    expect(result.error).toBeNull()
    expect(mocks.updateMember).toHaveBeenCalledTimes(1)
  })
})
