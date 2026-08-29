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
      const map = new Map<string, Result>()
      return (...args: Args): Result => {
        const k = JSON.stringify(args)
        const c = map.get(k)
        if (c !== undefined) return c
        const r = fn(...args)
        map.set(k, r)
        return r
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

describe('access-context — legacy attack resistance', () => {
  beforeEach(() => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['console:support'] },
    })
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
    vi.clearAllMocks()
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'admin',
      status: 'active',
      role: { permissions: ['console:support'] },
    })
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
  })

  it('attacker with only legacy support gets requests, not support', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'attacker',
      roleName: 'legacy',
      status: 'active',
      role: { permissions: ['console:support'] },
    })
    const c = await resolveAccessContext('attacker_001')
    expect(c?.permissions).toEqual(['console:requests'])
    expect(c?.permissions).not.toContain('console:support')
  })

  it('attacker cannot elevate via __proto__ injection', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'hacker',
      status: 'active',
      role: { permissions: ['__proto__', 'console:support', 'constructor'] },
    })
    const c = await resolveAccessContext('attacker_proto_001')
    expect(c?.permissions).toEqual(['console:requests'])
  })

  it('attacker cannot use case-variant console:SUPPORT', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'hacker',
      status: 'active',
      role: { permissions: ['CONSOLE:SUPPORT', 'Console:Support'] },
    })
    const c = await resolveAccessContext('attacker_case_001')
    expect(c?.permissions).toEqual([])
  })

  it('attacker with mixed stale and legacy only gets live catalog', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'mix',
      status: 'active',
      role: {
        permissions: [
          'console:support',
          'evil:admin',
          'console:access',
          'not:a:real:perm',
        ],
      },
    })
    const c = await resolveAccessContext('attacker_mix_001')
    expect(c?.permissions).toEqual(['console:access', 'console:requests'])
  })

  it('inactive attacker gets nothing even with legacy', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'attacker',
      roleName: 'legacy',
      status: 'suspended',
      role: { permissions: ['console:support'] },
    })
    const c = await resolveAccessContext('attacker_inactive_001')
    expect(c?.permissions).toEqual([])
  })

  it('very large permission array with many legacies collapses to single request', async () => {
    const perms = Array.from({ length: 100 }, () => 'console:support')
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'bulk',
      status: 'active',
      role: { permissions: perms },
    })
    const c = await resolveAccessContext('attacker_bulk_001')
    expect(c?.permissions).toEqual(['console:requests'])
  })

  it('payload never contains __proto__ as granted permission', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'u',
      roleName: 'hacker',
      status: 'active',
      role: { permissions: ['__proto__', 'console:access'] },
    })
    const c = await resolveAccessContext('attacker_proto2_001')
    expect(c?.permissions).toEqual(['console:access'])
    expect(JSON.stringify(c)).not.toContain('__proto__')
  })
})
