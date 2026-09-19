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
    ) => fn,
  }
})

vi.mock('@/lib/records', () => ({
  records: { team: { retrieve: mocks.retrieveTeamMember } },
}))

vi.mock('@/lib/features', () => ({
  getConsoleFeatureKeys: mocks.getConsoleFeatureKeys,
}))

describe('resolveAccessContext advanced boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getConsoleFeatureKeys.mockResolvedValue([])
  })

  it('fails closed when every stored permission is outside the catalog', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'user_stale_permissions',
      roleName: 'stale',
      status: 'active',
      role: { permissions: ['legacy:root', '__proto__', 'constructor'] },
    })

    const result = await resolveAccessContext('user_stale_permissions')

    expect(result).toEqual({
      subject: { userId: 'user_stale_permissions' },
      permissions: [],
      features: [],
      experiments: {},
    })
    expect(mocks.getConsoleFeatureKeys).toHaveBeenCalledTimes(1)
    expect(mocks.getConsoleFeatureKeys).toHaveBeenCalledWith(
      'user_stale_permissions'
    )
  })

  it('does not resolve features for a suspended grant', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'user_suspended_advanced',
      roleName: 'admin',
      status: 'suspended',
      role: { permissions: ['console:access', 'console:requests'] },
    })

    const result = await resolveAccessContext('user_suspended_advanced')

    expect(result).toEqual({
      subject: { userId: 'user_suspended_advanced' },
      permissions: [],
      features: [],
      experiments: {},
    })
    expect(mocks.getConsoleFeatureKeys).not.toHaveBeenCalled()
  })

  it('filters non-string feature values without losing valid keys', async () => {
    mocks.retrieveTeamMember.mockResolvedValue({
      userId: 'user_feature_shape',
      roleName: 'staff',
      status: 'active',
      role: { permissions: ['console:access'] },
    })
    mocks.getConsoleFeatureKeys.mockResolvedValue([
      'console_requests_beta',
      null,
      42,
      'console_reports',
    ])

    const result = await resolveAccessContext('user_feature_shape')

    expect(result).toEqual({
      subject: { userId: 'user_feature_shape' },
      permissions: ['console:access'],
      features: ['console_requests_beta', 'console_reports'],
      experiments: {},
    })
    expect(mocks.getConsoleFeatureKeys).toHaveBeenCalledTimes(1)
  })
})
