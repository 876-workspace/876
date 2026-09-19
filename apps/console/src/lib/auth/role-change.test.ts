import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Access } from '@/types/auth'

import {
  applyRoleChange,
  assertRoleChangeAllowed,
  assertTeamGrantChangeAllowed,
} from './role-change'

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/records/team', () => ({ team: mocks }))

function createCaller(overrides: Partial<Access> = {}): Access {
  return {
    id: 'user_caller',
    role: 'admin',
    permissions: ['console:access', 'users:update'],
    status: 'active',
    ...overrides,
  }
}

describe('assertRoleChangeAllowed', () => {
  beforeEach(() => {
    mocks.retrieve.mockResolvedValue(null)
    vi.clearAllMocks()
  })

  it.each(['', 'support', 'ADMIN', '__proto__'])(
    'rejects invalid role %j without loading the target',
    async (role) => {
      const result = await assertRoleChangeAllowed(
        createCaller(),
        'user_target',
        role
      )

      expect(result).toEqual({
        ok: false,
        error: 'Invalid role. Must be user, staff, admin, or super-admin.',
        status: 400,
      })
      expect(mocks.retrieve).not.toHaveBeenCalled()
    }
  )

  it.each(['user', 'staff', 'admin', 'super-admin'])(
    'allows a super admin to grant %s after loading the target',
    async (role) => {
      const result = await assertRoleChangeAllowed(
        createCaller({ role: 'super-admin' }),
        'user_target',
        role
      )

      expect(result).toEqual({ ok: true })
      expect(mocks.retrieve).toHaveBeenCalledWith('user_target')
    }
  )

  it.each(['super-admin'])(
    'prevents an admin from granting %s after loading the target',
    async (role) => {
      const result = await assertRoleChangeAllowed(
        createCaller(),
        'user_target',
        role
      )

      expect(result).toEqual({
        ok: false,
        error: `Only a super admin can grant the ${role} role.`,
        status: 403,
      })
      expect(mocks.retrieve).toHaveBeenCalledWith('user_target')
    }
  )

  it.each(['super-admin'])(
    'prevents an admin from changing an existing %s',
    async (targetRole) => {
      mocks.retrieve.mockResolvedValue({ roleName: targetRole })

      const result = await assertRoleChangeAllowed(
        createCaller(),
        'user_target',
        'staff'
      )

      expect(result).toEqual({
        ok: false,
        error: 'Only a super admin can change the role of this Console member.',
        status: 403,
      })
      expect(mocks.retrieve).toHaveBeenCalledTimes(1)
      expect(mocks.retrieve).toHaveBeenCalledWith('user_target')
    }
  )

  it.each([null, { roleName: 'staff' }])(
    'allows a safe role change for target %j',
    async (target) => {
      mocks.retrieve.mockResolvedValue(target)

      const result = await assertRoleChangeAllowed(
        createCaller(),
        'user_target',
        'admin'
      )

      expect(result).toEqual({ ok: true })
      expect(mocks.retrieve).toHaveBeenCalledTimes(1)
      expect(mocks.retrieve).toHaveBeenCalledWith('user_target')
    }
  )
})

describe('applyRoleChange', () => {
  beforeEach(() => {
    mocks.retrieve.mockResolvedValue(null)
    mocks.create.mockResolvedValue({
      data: { userId: 'user_target', roleName: 'staff' },
      error: null,
    })
    mocks.update.mockResolvedValue({
      data: { userId: 'user_target', roleName: 'admin' },
      error: null,
    })
    mocks.delete.mockResolvedValue({ count: 1 })
    vi.clearAllMocks()
  })

  it('revokes Console access for the user sentinel role', async () => {
    const result = await applyRoleChange('user_target', 'user')

    expect(result).toEqual({
      data: { userId: 'user_target', role: 'user', revoked: true },
      error: null,
    })
    expect(mocks.delete).toHaveBeenCalledTimes(1)
    expect(mocks.delete).toHaveBeenCalledWith('user_target')
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('updates an existing access grant', async () => {
    mocks.retrieve.mockResolvedValue({
      userId: 'user_target',
      roleName: 'staff',
    })

    const result = await applyRoleChange('user_target', 'admin')

    expect(result).toEqual({
      data: { userId: 'user_target', role: 'admin', revoked: false },
      error: null,
    })
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('user_target')
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('user_target', {
      roleName: 'admin',
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('normalizes a legacy persisted role returned by the service', async () => {
    mocks.retrieve.mockResolvedValue({
      userId: 'user_target',
      roleName: 'staff',
    })
    mocks.update.mockResolvedValue({
      data: { userId: 'user_target', roleName: 'super-admin' },
      error: null,
    })

    const result = await applyRoleChange('user_target', 'super-admin')

    expect(result).toEqual({
      data: { userId: 'user_target', role: 'super-admin', revoked: false },
      error: null,
    })
  })

  it('creates a missing access grant', async () => {
    const result = await applyRoleChange('user_target', 'staff')

    expect(result).toEqual({
      data: { userId: 'user_target', role: 'staff', revoked: false },
      error: null,
    })
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('user_target')
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('user_target', 'staff')
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('propagates a create validation error instead of reading a null grant', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: {
        code: 'team/justification-required',
        message: 'A justification is required for a non-staff grant.',
      },
    })

    const result = await applyRoleChange('user_target', 'staff')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'team/justification-required',
        message: 'A justification is required for a non-staff grant.',
      },
    })
  })

  it('propagates an update validation error', async () => {
    mocks.retrieve.mockResolvedValue({
      userId: 'user_target',
      roleName: 'staff',
    })
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'team/member-not-found',
        message: 'Console access grant was not found.',
      },
    })

    const result = await applyRoleChange('user_target', 'admin')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('team/member-not-found')
  })
})

describe('assertTeamGrantChangeAllowed', () => {
  beforeEach(() => {
    mocks.retrieve.mockResolvedValue({
      userId: 'user_target',
      roleName: 'admin',
      status: 'active',
    })
    vi.clearAllMocks()
  })

  it('prevents an operator from revoking their own Console access', async () => {
    const result = await assertTeamGrantChangeAllowed(
      createCaller(),
      'user_caller',
      { revoke: true }
    )

    expect(result).toEqual({ ok: false, code: 'team/self-access-protected' })
  })

  it('prevents an admin from granting the super-admin role', async () => {
    const result = await assertTeamGrantChangeAllowed(
      createCaller(),
      'user_target',
      { roleName: 'super-admin' }
    )

    expect(result).toEqual({ ok: false, code: 'team/role-forbidden' })
  })
})
