import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Access } from '@/types/auth'

import { create } from './create'
import { deleteUser } from './delete'
import { users } from './index'
import { setRole } from './set-role'
import { update } from './update'

const mocks = vi.hoisted(() => ({
  userCreate: vi.fn(),
  userDelete: vi.fn(),
  userUpdate: vi.fn(),
  orgCreate: vi.fn(),
  membershipCreate: vi.fn(),
  assertRoleChangeAllowed: vi.fn(),
  applyRoleChange: vi.fn(),
}))

vi.mock('@/lib/876', () => ({
  $876: {
    users: {
      create: mocks.userCreate,
      delete: mocks.userDelete,
      update: mocks.userUpdate,
    },
    orgs: { create: mocks.orgCreate },
    memberships: { create: mocks.membershipCreate },
  },
}))

vi.mock('@/lib/auth/role-change', () => ({
  assertRoleChangeAllowed: mocks.assertRoleChangeAllowed,
  applyRoleChange: mocks.applyRoleChange,
}))

const caller: Access = {
  id: 'user_caller',
  role: 'admin',
  permissions: ['console:access', 'users:update'],
  status: 'active',
}

const createdUser = {
  object: 'user',
  id: 'user_created',
  email: 'alejandra@example.com',
}

describe('Console users service', () => {
  beforeEach(() => {
    mocks.userCreate.mockResolvedValue({ data: createdUser, error: null })
    mocks.userDelete.mockResolvedValue({
      data: { object: 'user', id: 'user_target', deleted: true },
      error: null,
    })
    mocks.userUpdate.mockResolvedValue({ data: createdUser, error: null })
    mocks.orgCreate.mockResolvedValue({
      data: { object: 'organization', id: 'org_created' },
      error: null,
    })
    mocks.membershipCreate.mockResolvedValue({
      data: { object: 'membership', id: 'membership_created' },
      error: null,
    })
    mocks.assertRoleChangeAllowed.mockResolvedValue({ ok: true })
    mocks.applyRoleChange.mockResolvedValue({
      userId: 'user_target',
      role: 'staff',
      revoked: false,
    })
    vi.clearAllMocks()
  })

  it('returns the created user without organization side effects', async () => {
    const params = {
      email: 'alejandra@example.com',
      first_name: 'Alejandra',
    } as Parameters<typeof create>[0]

    const result = await create(params)

    expect(result).toEqual({ data: createdUser, error: null })
    expect(mocks.userCreate).toHaveBeenCalledTimes(1)
    expect(mocks.userCreate).toHaveBeenCalledWith(params)
    expect(mocks.orgCreate).not.toHaveBeenCalled()
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it('ignores a whitespace-only organization name', async () => {
    const result = await create({
      email: 'alejandra@example.com',
      organization_name: ' \t ',
    } as Parameters<typeof create>[0])

    expect(result).toEqual({ data: createdUser, error: null })
    expect(mocks.userCreate).toHaveBeenCalledWith({
      email: 'alejandra@example.com',
    })
    expect(mocks.orgCreate).not.toHaveBeenCalled()
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it('returns the upstream user-create error without later side effects', async () => {
    mocks.userCreate.mockResolvedValue({
      data: null,
      error: { message: 'Email is already registered.' },
    })

    const result = await create({
      email: 'alejandra@example.com',
      organization_name: 'Efesto Technologies',
    } as Parameters<typeof create>[0])

    expect(result).toEqual({
      data: null,
      error: 'Email is already registered.',
      status: undefined,
    })
    expect(mocks.orgCreate).not.toHaveBeenCalled()
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it('uses a fallback when user creation returns no data or error', async () => {
    mocks.userCreate.mockResolvedValue({ data: null, error: null })

    const result = await create({
      email: 'alejandra@example.com',
    } as Parameters<typeof create>[0])

    expect(result).toEqual({
      data: null,
      error: 'Failed to create user.',
      status: undefined,
    })
    expect(mocks.orgCreate).not.toHaveBeenCalled()
  })

  it('creates a trimmed organization and active owner membership', async () => {
    const result = await create({
      email: 'alejandra@example.com',
      organization_name: '  Efesto Technologies  ',
    } as Parameters<typeof create>[0])

    expect(result).toEqual({ data: createdUser, error: null })
    expect(mocks.orgCreate).toHaveBeenCalledTimes(1)
    expect(mocks.orgCreate).toHaveBeenCalledWith({
      name: 'Efesto Technologies',
    })
    expect(mocks.membershipCreate).toHaveBeenCalledTimes(1)
    expect(mocks.membershipCreate).toHaveBeenCalledWith({
      user_id: 'user_created',
      organization_id: 'org_created',
      role: 'owner',
      status: 'active',
    })
  })

  it.each([
    ['an organization error', { data: null, error: { message: 'Conflict.' } }],
    ['missing organization data', { data: null, error: null }],
  ])('returns a warning for %s', async (_name, orgResult) => {
    mocks.orgCreate.mockResolvedValue(orgResult)

    const result = await create({
      email: 'alejandra@example.com',
      organization_name: 'Efesto Technologies',
    } as Parameters<typeof create>[0])

    expect(result).toEqual({
      data: createdUser,
      error: null,
      warning: 'User created but organization could not be created.',
    })
    expect(mocks.membershipCreate).not.toHaveBeenCalled()
  })

  it('returns a warning when membership creation fails', async () => {
    mocks.membershipCreate.mockResolvedValue({
      data: null,
      error: { message: 'Membership unavailable.' },
    })

    const result = await create({
      email: 'alejandra@example.com',
      organization_name: 'Efesto Technologies',
    } as Parameters<typeof create>[0])

    expect(result).toEqual({
      data: createdUser,
      error: null,
      warning:
        'User and organization created but membership could not be established.',
    })
  })

  it('soft-deletes a user with the acting operator ID', async () => {
    const result = await deleteUser('user_target', caller)

    expect(result).toEqual({
      data: { object: 'user', id: 'user_target', deleted: true },
      error: null,
    })
    expect(mocks.userDelete).toHaveBeenCalledTimes(1)
    expect(mocks.userDelete).toHaveBeenCalledWith('user_target', {
      deletedBy: 'user_caller',
    })
  })

  it.each([
    [
      'an upstream delete error',
      { data: null, error: { message: 'Forbidden.' } },
      'Forbidden.',
    ],
    [
      'missing delete data',
      { data: null, error: null },
      'Failed to delete user.',
    ],
  ])('returns a client-safe error for %s', async (_name, deleted, message) => {
    mocks.userDelete.mockResolvedValue(deleted)

    const result = await deleteUser('user_target', caller)

    expect(result).toEqual({ data: null, error: message, status: undefined })
  })

  it('stops a denied role change before applying it', async () => {
    mocks.assertRoleChangeAllowed.mockResolvedValue({
      ok: false,
      error: 'Only a super admin can grant the owner role.',
      status: 403,
    })

    const result = await setRole('user_target', 'owner', caller)

    expect(result).toEqual({
      data: null,
      error: 'Only a super admin can grant the owner role.',
      status: 403,
    })
    expect(mocks.assertRoleChangeAllowed).toHaveBeenCalledTimes(1)
    expect(mocks.assertRoleChangeAllowed).toHaveBeenCalledWith(
      caller,
      'user_target',
      'owner'
    )
    expect(mocks.applyRoleChange).not.toHaveBeenCalled()
  })

  it('applies an allowed role change', async () => {
    const result = await setRole('user_target', 'staff', caller)

    expect(result).toEqual({
      data: { userId: 'user_target', role: 'staff', revoked: false },
      error: null,
    })
    expect(mocks.applyRoleChange).toHaveBeenCalledTimes(1)
    expect(mocks.applyRoleChange).toHaveBeenCalledWith('user_target', 'staff')
  })

  it('checks and applies a string role during a user update', async () => {
    const body = { first_name: 'Alejandra', role: 'staff' } as never

    const result = await update('user_target', body, caller)

    expect(result).toEqual({ data: createdUser, error: null })
    expect(mocks.assertRoleChangeAllowed).toHaveBeenCalledTimes(1)
    expect(mocks.assertRoleChangeAllowed).toHaveBeenCalledWith(
      caller,
      'user_target',
      'staff'
    )
    expect(mocks.userUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.userUpdate).toHaveBeenCalledWith('user_target', body)
  })

  it('stops a denied inline role before updating the user', async () => {
    mocks.assertRoleChangeAllowed.mockResolvedValue({
      ok: false,
      error: 'Forbidden role change.',
      status: 403,
    })
    const body = { role: 'owner' } as never

    const result = await update('user_target', body, caller)

    expect(result).toEqual({
      data: null,
      error: 'Forbidden role change.',
      status: 403,
    })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it.each([
    ['without a caller', undefined, { role: 'staff' }],
    ['with a non-string role', caller, { role: null }],
    ['without a role', caller, { first_name: 'Alejandra' }],
  ])(
    'updates %s without a role escalation check',
    async (_name, actor, body) => {
      const result = await update('user_target', body as never, actor)

      expect(result).toEqual({ data: createdUser, error: null })
      expect(mocks.assertRoleChangeAllowed).not.toHaveBeenCalled()
      expect(mocks.userUpdate).toHaveBeenCalledTimes(1)
      expect(mocks.userUpdate).toHaveBeenCalledWith('user_target', body)
    }
  )

  it.each([
    [
      'an upstream update error',
      { data: null, error: { message: 'Invalid.' } },
      'Invalid.',
    ],
    [
      'missing update data',
      { data: null, error: null },
      'Failed to update user.',
    ],
  ])(
    'returns a client-safe update error for %s',
    async (_name, updated, message) => {
      mocks.userUpdate.mockResolvedValue(updated)

      const result = await update('user_target', {} as never)

      expect(result).toEqual({ data: null, error: message, status: undefined })
    }
  )

  it('exposes each operation on the users facade', () => {
    expect(users).toEqual({
      create,
      update,
      delete: deleteUser,
      setRole,
    })
  })
})
