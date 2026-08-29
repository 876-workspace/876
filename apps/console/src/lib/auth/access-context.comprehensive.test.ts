import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveAccessContext, resolveConsoleGrant } from './access-context'

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
  role: { permissions: string[] } | null
}

function activeMember(overrides: Partial<Member> = {}): Member {
  return {
    userId: 'user_adv_001',
    roleName: 'admin',
    status: 'active',
    role: { permissions: ['console:access', 'users:read'] },
    ...overrides,
  }
}

describe('resolveConsoleGrant — comprehensive', () => {
  beforeEach(() => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
    vi.clearAllMocks()
    // prime mock after clear
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
  })

  it('delegates to service.team.retrieve with primitive userId', async () => {
    await resolveConsoleGrant('user_abc')
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith('user_abc')
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
  })

  it('returns member when found', async () => {
    const member = activeMember({ userId: 'u1' })
    mocks.retrieveTeamMember.mockResolvedValue(member)
    await expect(resolveConsoleGrant('u1')).resolves.toEqual(member)
  })

  it('returns null when no grant', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(null)
    await expect(resolveConsoleGrant('missing')).resolves.toBeNull()
  })

  it('propagates datastore error', async () => {
    const freshId = 'user_error_grant_001'
    mocks.retrieveTeamMember.mockRejectedValue(new Error('db down'))
    await expect(resolveConsoleGrant(freshId)).rejects.toThrow('db down')
  })

  it('memoizes identical userId calls', async () => {
    const id = 'user_memo_001'
    mocks.retrieveTeamMember.mockResolvedValue(activeMember({ userId: id }))
    const [a, b] = await Promise.all([
      resolveConsoleGrant(id),
      resolveConsoleGrant(id),
    ])
    expect(a).toEqual(b)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
  })
})

describe('resolveAccessContext — stored permission keys and security', () => {
  beforeEach(() => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
    vi.clearAllMocks()
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
  })

  it('returns null for missing grant and does not fetch features', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(null)
    const result = await resolveAccessContext('ghost')
    expect(result).toBeNull()
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
  })

  it('drops a retired support key and keeps the canonical requests key', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: { permissions: ['console:support', 'console:requests'] },
      })
    )

    const result = await resolveAccessContext('user_stored_1')

    expect(result?.permissions).toEqual(['console:requests'])
    expect(result?.permissions).not.toContain('console:support')
  })

  it('adapts mixed legacy and canonical — no duplication beyond catalog sort', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: {
          permissions: ['console:requests', 'console:requests', 'users:read'],
        },
      })
    )
    const result = await resolveAccessContext('user_mix_1')
    // both support and requests adapt to requests, deduped and sorted
    expect(result?.permissions).toEqual(['console:requests', 'users:read'])
  })

  it('does not adapt unrelated keys — only support', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: ['users:read', 'console:access'] } })
    )
    const result = await resolveAccessContext('user_unrelated_1')
    expect(result?.permissions).toEqual(['console:access', 'users:read'])
  })

  it('drops stale permission not in catalog (e.g., legacy:root)', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: ['console:access', 'legacy:root'] } })
    )
    const result = await resolveAccessContext('user_stale_1')
    expect(result?.permissions).toEqual(['console:access'])
  })

  it('returns empty permissions for suspended member', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ status: 'suspended' })
    )
    const result = await resolveAccessContext('user_susp_1')
    expect(result?.permissions).toEqual([])
    expect(result?.features).toEqual([])
  })

  it('returns empty permissions for revoked member', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ status: 'revoked' })
    )
    const result = await resolveAccessContext('user_rev_1')
    expect(result?.permissions).toEqual([])
  })

  it('returns empty permissions when role is null (member without role row)', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember({ role: null }))
    const result = await resolveAccessContext('user_norole_1')
    expect(result?.permissions).toEqual([])
  })

  it('filters non-string permissions in role by adaptation layer', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: {
          permissions: [
            'console:access',
            42 as unknown as string,
            null as unknown as string,
          ],
        },
      })
    )
    const result = await resolveAccessContext('user_filter_1')
    expect(result?.permissions).toEqual(['console:access'])
  })

  it('sorts and deduplicates permissions', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: { permissions: ['users:read', 'console:access', 'users:read'] },
      })
    )
    const result = await resolveAccessContext('user_sort_1')
    expect(result?.permissions).toEqual(['console:access', 'users:read'])
  })

  it('keeps dangerous permission when live in catalog', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: { permissions: ['console:access', 'users:delete'] },
      })
    )
    const result = await resolveAccessContext('user_danger_1')
    expect(result?.permissions).toContain('users:delete')
  })

  it('subject is always the requested userId, not member.userId', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ userId: 'different' })
    )
    const result = await resolveAccessContext('requested_id')
    expect(result?.subject).toEqual({ userId: 'requested_id' })
  })

  it('features are empty when feature pipeline returns []', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
    const result = await resolveAccessContext('user_feat_empty')
    expect(result?.features).toEqual([])
  })

  it('features are populated when pipeline returns keys', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue(['feat_a', 'feat_b'])
    const result = await resolveAccessContext('user_feat_pop')
    expect(result?.features).toEqual(['feat_a', 'feat_b'])
  })

  it('features degrade to [] when getConsoleFeatureKeys throws — permissions preserved', async () => {
    mocks.getConsoleFeatureKeys.mockRejectedValue(new Error('PostHog down'))
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: ['console:access'] } })
    )
    const result = await resolveAccessContext('user_feat_fail')
    expect(result?.permissions).toEqual(['console:access'])
    expect(result?.features).toEqual([])
  })

  it('filters non-string feature values', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue([
      'feat_a',
      123,
      null,
    ] as unknown as string[])
    const result = await resolveAccessContext('user_feat_filter')
    expect(result?.features).toEqual(['feat_a'])
  })

  it('treats non-array feature result as []', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue(
      'feat_a' as unknown as string[]
    )
    const result = await resolveAccessContext('user_feat_nonarray')
    expect(result?.features).toEqual([])
  })

  it('does not call feature pipeline for missing grant', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(null)
    await resolveAccessContext('user_no_grant_feat')
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
  })

  it('does not call feature pipeline for inactive member', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ status: 'suspended' })
    )
    const result = await resolveAccessContext('user_inactive_feat')
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
    expect(result?.features).toEqual([])
  })

  it('experiments is always empty presentational map', async () => {
    const result = await resolveAccessContext('user_exp_1')
    expect(result?.experiments).toEqual({})
  })

  it('propagates datastore failure instead of granting access', async () => {
    mocks.retrieveTeamMember.mockRejectedValue(
      new Error('database unavailable')
    )
    await expect(resolveAccessContext('user_db_fail')).rejects.toThrow(
      'database unavailable'
    )
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
  })

  it('handles 50 legacy permissions stress', async () => {
    const perms = Array.from({ length: 50 }, () => 'console:requests')
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: perms } })
    )
    const result = await resolveAccessContext('user_stress_legacy')
    expect(result?.permissions).toEqual(['console:requests'])
  })

  it('case-sensitive: Console:Support not adapted, filtered by catalog', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: ['Console:Support'] } })
    )
    const result = await resolveAccessContext('user_case_1')
    expect(result?.permissions).toEqual([])
  })

  it('whitespace-padded legacy not adapted', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: [' console:support'] } })
    )
    const result = await resolveAccessContext('user_ws_1')
    expect(result?.permissions).toEqual([])
  })

  it('payload is JSON-serializable', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue(['feat'])
    const result = await resolveAccessContext('user_json_1')
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('does not expose role name via context', async () => {
    const result = await resolveAccessContext('user_role_leak')
    expect(result).not.toHaveProperty('role')
    expect(result).not.toHaveProperty('roleName')
  })

  it('distinct userIds use distinct cache entries', async () => {
    const a = await resolveAccessContext('user_cache_a')
    const b = await resolveAccessContext('user_cache_b')
    expect(a?.subject.userId).toBe('user_cache_a')
    expect(b?.subject.userId).toBe('user_cache_b')
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(2)
  })

  it('identical userIds are memoized (single datastore hit)', async () => {
    const id = 'user_memo_ctx_001'
    mocks.retrieveTeamMember.mockResolvedValue(activeMember({ userId: id }))
    const [first, second] = await Promise.all([
      resolveAccessContext(id),
      resolveAccessContext(id),
    ])
    expect(first).toEqual(second)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
  })
})
