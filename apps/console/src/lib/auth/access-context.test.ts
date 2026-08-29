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
  role: { permissions: string[] } | null
}

function activeMember(overrides: Partial<Member> = {}): Member {
  return {
    userId: 'user_695d45c54a374ff0a570003e15668891',
    roleName: 'admin',
    status: 'active',
    role: {
      permissions: ['console:access', 'users:read', 'users:update'],
    },
    ...overrides,
  }
}

describe('resolveAccessContext', () => {
  beforeEach(() => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember())
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
    vi.clearAllMocks()
  })

  it('returns null when the user has no Console access grant', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(null)

    const result = await resolveAccessContext('user_missing_01')

    expect(result).toBeNull()
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith('user_missing_01')
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
  })

  it('returns the acting user as the context subject', async () => {
    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668892'
    )

    expect(result?.subject).toEqual({
      userId: 'user_695d45c54a374ff0a570003e15668892',
    })
  })

  it('resolves active role permissions against the Console catalog', async () => {
    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668893'
    )

    expect(result?.permissions).toEqual([
      'console:access',
      'users:read',
      'users:update',
    ])
  })

  it('removes a stale role permission that no longer exists in the catalog', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: {
          permissions: ['console:access', 'users:read', 'legacy:root'],
        },
      })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668894'
    )

    expect(result?.permissions).toEqual(['console:access', 'users:read'])
  })

  it('does not invent Console access when the role omits it', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: ['users:read'] } })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668895'
    )

    expect(result?.permissions).toEqual(['users:read'])
  })

  it('keeps a dangerous permission when it is live in the catalog', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: { permissions: ['console:access', 'users:delete'] },
      })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668896'
    )

    expect(result?.permissions).toEqual(['console:access', 'users:delete'])
  })

  it('deduplicates and sorts effective permissions', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: {
          permissions: ['users:update', 'console:access', 'users:update'],
        },
      })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668897'
    )

    expect(result?.permissions).toEqual(['console:access', 'users:update'])
  })

  it('returns no permissions when the persisted member has no role row', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(activeMember({ role: null }))

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668898'
    )

    expect(result?.permissions).toEqual([])
  })

  it('returns no permissions for a suspended Console grant', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ status: 'suspended' })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668899'
    )

    expect(result?.permissions).toEqual([])
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
  })

  it('returns no permissions for an empty role permission set', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: [] } })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668900'
    )

    expect(result?.permissions).toEqual([])
  })

  it('degrades a malformed role permission value to no permissions', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({
        role: {
          permissions: 'console:access' as unknown as string[],
        },
      })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668901'
    )

    expect(result?.permissions).toEqual([])
  })

  it('includes enabled feature keys from the existing feature pipeline', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue([
      'console_search_bar',
      'console_widgets',
    ])

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668902'
    )

    expect(result?.features).toEqual([
      'console_search_bar',
      'console_widgets',
    ])
    expect(mocks.getConsoleFeatureKeys).toHaveBeenCalledTimes(1)
    expect(mocks.getConsoleFeatureKeys).toHaveBeenCalledWith(
      'user_695d45c54a374ff0a570003e15668902'
    )
  })

  it('degrades a feature-pipeline outage to no features', async () => {
    mocks.getConsoleFeatureKeys.mockRejectedValue(new Error('PostHog unavailable'))

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668903'
    )

    expect(result?.features).toEqual([])
  })

  it('keeps permissions when the feature pipeline is unavailable', async () => {
    mocks.getConsoleFeatureKeys.mockRejectedValue(new Error('PostHog unavailable'))

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668904'
    )

    expect(result?.permissions).toEqual([
      'console:access',
      'users:read',
      'users:update',
    ])
  })

  it('filters non-string values from malformed feature output', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue([
      'console_search_bar',
      42,
      null,
    ] as unknown as string[])

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668905'
    )

    expect(result?.features).toEqual(['console_search_bar'])
  })

  it('degrades a non-array feature result to no features', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue(
      'console_search_bar' as unknown as string[]
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668906'
    )

    expect(result?.features).toEqual([])
  })

  it('initializes experiments as an empty presentational map', async () => {
    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668907'
    )

    expect(result?.experiments).toEqual({})
  })

  it('never uses experiment data to widen permissions', async () => {
    mocks.retrieveTeamMember.mockResolvedValue(
      activeMember({ role: { permissions: ['console:access'] } })
    )

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668908'
    )

    expect(result).toEqual({
      subject: { userId: 'user_695d45c54a374ff0a570003e15668908' },
      permissions: ['console:access'],
      features: [],
      experiments: {},
    })
  })

  it('memoizes the grant lookup for two identical resolver calls', async () => {
    const userId = 'user_695d45c54a374ff0a570003e15668909'

    const result = await Promise.all([
      resolveAccessContext(userId),
      resolveAccessContext(userId),
    ])

    expect(result[0]).toEqual(result[1])
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveTeamMember).toHaveBeenCalledWith(userId)
    expect(mocks.getConsoleFeatureKeys).toHaveBeenCalledTimes(1)
  })

  it('uses distinct cache entries for distinct primitive user ids', async () => {
    const result = await Promise.all([
      resolveAccessContext('user_695d45c54a374ff0a570003e15668910'),
      resolveAccessContext('user_695d45c54a374ff0a570003e15668911'),
    ])

    expect(result.map((value) => value?.subject.userId)).toEqual([
      'user_695d45c54a374ff0a570003e15668910',
      'user_695d45c54a374ff0a570003e15668911',
    ])
    expect(mocks.retrieveTeamMember).toHaveBeenCalledTimes(2)
  })

  it('propagates a Console datastore failure instead of granting access', async () => {
    mocks.retrieveTeamMember.mockRejectedValue(new Error('database unavailable'))

    const act = resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668912'
    )

    await expect(act).rejects.toThrow('database unavailable')
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
  })

  it('returns a structurally cloneable context payload', async () => {
    mocks.getConsoleFeatureKeys.mockResolvedValue(['console_search_bar'])

    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668913'
    )

    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('does not expose the persisted role name through the shared context', async () => {
    const result = await resolveAccessContext(
      'user_695d45c54a374ff0a570003e15668914'
    )

    expect(result).not.toHaveProperty('role')
  })
})
