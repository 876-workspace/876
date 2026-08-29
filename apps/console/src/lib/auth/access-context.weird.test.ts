import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveAccessContext } from './access-context'

const mocks = vi.hoisted(() => ({
  retrieveTeamMember: vi.fn(),
  getConsoleFeatureKeys: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <Args extends readonly unknown[], Result>(
      fn: (...args: Args) => Result
    ) => {
      const values = new Map<string, Result>()
      return (...args: Args): Result => {
        const key = JSON.stringify(args)
        const cached = values.get(key)
        if (cached !== undefined) return cached
        const result = fn(...args)
        values.set(key, result)
        return result
      }
    },
  }
})

vi.mock('@/lib/service', () => ({
  service: { team: { retrieve: mocks.retrieveTeamMember } },
}))

vi.mock('@/lib/features', () => ({
  getConsoleFeatureKeys: mocks.getConsoleFeatureKeys,
}))

type Member = {
  userId: string
  roleName: string
  status: string
  role: { permissions: unknown } | null
}

describe('resolveAccessContext — weird and hostile', () => {
  beforeEach(() => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['console:access'] },
    })
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
    vi.clearAllMocks()
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['console:access'] },
    })
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
  })

  it('handles role.permissions as non-array string without throwing', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: 'console:access' as unknown as string[] },
    })
    const result = await resolveAccessContext('user_weird_1')
    expect(result?.permissions).toEqual([])
  })

  it('handles role.permissions containing prototype pollution string', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['__proto__', 'console:access', 'constructor'] },
    })
    const result = await resolveAccessContext('user_proto_1')
    expect(result?.permissions).toEqual(['console:access'])
  })

  it('handles role as string without throwing', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: 'admin' as unknown as null,
    })
    const result = await resolveAccessContext('user_role_str')
    expect(result?.permissions).toEqual([])
  })

  it('handles member status null as inactive — no permissions', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: null as unknown as string,
      role: { permissions: ['console:access'] },
    })
    const result = await resolveAccessContext('user_null_status')
    expect(result?.permissions).toEqual([])
  })

  it('handles member status with weird casing not equal active', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'Active',
      role: { permissions: ['console:access'] },
    })
    const result = await resolveAccessContext('user_case_status')
    expect(result?.permissions).toEqual([])
  })

  it('handles permissions with emoji and unicode', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['console:access', 'perm:🔥', 'users:read'] },
    })
    const result = await resolveAccessContext('user_emoji')
    expect(result?.permissions).toEqual(['console:access', 'users:read'])
  })

  it('handles 500 legacy entries without hanging', async () => {
    const perms = Array.from({ length: 500 }, () => 'console:requests')
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: perms },
    })
    const result = await resolveAccessContext('user_500_legacy')
    expect(result?.permissions).toEqual(['console:requests'])
  })

  it('handles permission array with holes (sparse)', async () => {
    const sparse: unknown[] = []
    sparse[2] = 'console:requests'
    sparse[5] = 'console:access'
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: sparse as string[] },
    })
    const result = await resolveAccessContext('user_sparse')
    expect(result?.permissions).toEqual(['console:access', 'console:requests'])
  })

  it('handles getConsoleFeatureKeys returning object instead of array', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue({
      feat: true,
    } as unknown as string[])
    const result = await resolveAccessContext('user_feat_object')
    expect(result?.features).toEqual([])
    expect(result?.permissions).toEqual(['console:access'])
  })

  it('handles getConsoleFeatureKeys returning number', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue(123 as unknown as string[])
    const result = await resolveAccessContext('user_feat_number')
    expect(result?.features).toEqual([])
  })

  it('handles getConsoleFeatureKeys rejection with non-Error', async () => {
    mocks.getConsoleFeatureKeys.mockRejectedValue('string error')
    const result = await resolveAccessContext('user_feat_str_err')
    expect(result?.features).toEqual([])
    expect(result?.permissions).toEqual(['console:access'])
  })

  it('does not leak permissions when feature pipeline throws weird value', async () => {
    mocks.getConsoleFeatureKeys.mockRejectedValue({ message: 'weird' })
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['console:access', 'users:delete'] },
    })
    const result = await resolveAccessContext('user_feat_weird_err')
    expect(result?.permissions).toEqual(['console:access', 'users:delete'])
  })

  it('handles userId with special characters', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'user_special',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['console:access'] },
    })
    const result = await resolveAccessContext('user_🔥_!@#$')
    expect(result?.subject.userId).toBe('user_🔥_!@#$')
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith('user_🔥_!@#$')
  })

  it('handles empty string userId — still queries grant', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(null)
    const result = await resolveAccessContext('')
    expect(result).toBeNull()
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith('')
  })

  it('handles permission with 1000-char string', async () => {
    const long = 'a'.repeat(1000)
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: [long, 'console:access'] },
    })
    const result = await resolveAccessContext('user_long_perm')
    expect(result?.permissions).toEqual(['console:access'])
  })

  it('never throws for completely malformed member', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      weird: true,
    } as unknown as Member)
    await expect(resolveAccessContext('user_malformed')).resolves.toEqual({
      subject: { userId: 'user_malformed' },
      permissions: [],
      features: [],
      experiments: {},
    })
  })

  it('injection attempt in permission string is filtered, not executed', async () => {
    const evil = "console:access'; DROP TABLE members; --"
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: [evil, 'console:access'] },
    })
    const result = await resolveAccessContext('user_injection')
    expect(result?.permissions).toEqual(['console:access'])
  })
})
