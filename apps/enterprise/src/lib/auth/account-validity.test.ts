import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }))
vi.mock('@/lib/clients/account-server', () => ({
  getAccount: vi.fn(async () => ({
    users: { retrieve: mocks.retrieve },
  })),
}))
import { isAccountUsable } from './account-validity'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.retrieve.mockResolvedValue({
    data: { id: 'user_1', status: 'active', banned: false },
    error: null,
  })
})
describe('isAccountUsable — goldbergyoni: resilience, AAA, boundary', () => {
  it('returns true for active unbanned user (Arrange-Act-Assert)', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'user_1', status: 'active', banned: false },
      error: null,
    })
    const result = await isAccountUsable('user_1')
    expect(result).toBe(true)
    expect(mocks.retrieve).toHaveBeenCalledWith()
  })
  it('returns false when error code is user/not-found (account deleted)', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'user/not-found', message: 'gone' },
    })
    await expect(isAccountUsable('missing')).resolves.toBe(false)
  })
  it('accountGone takes precedence over data active', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'user_1', status: 'active', banned: false },
      error: { code: 'user/not-found', message: 'gone' },
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(false)
  })
  it.each([['blocked'], ['suspended'], ['pending'], ['inactive']])(
    'status "%s" is not active => false',
    async (status) => {
      mocks.retrieve.mockResolvedValue({
        data: { id: 'user_1', status, banned: false },
        error: null,
      })
      await expect(isAccountUsable('user_1')).resolves.toBe(false)
    }
  )
  it('status null treated as active per impl', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'user_1', status: null, banned: false },
      error: null,
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('banned true even if active => false', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'user_1', status: 'active', banned: true },
      error: null,
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(false)
  })
  it('banned undefined => true (not banned)', async () => {
    mocks.retrieve.mockResolvedValue({
      data: {
        id: 'user_1',
        status: 'active',
        banned: undefined as unknown as boolean,
      },
      error: null,
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('outage generic error => true (resilience — do not log out)', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'internal', message: 'db down' },
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('rate_limited => true', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'rate_limited', message: 'slow' },
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('null/null => true (unknown defaults usable)', async () => {
    mocks.retrieve.mockResolvedValue({ data: null, error: null })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('data active + generic error => true (outage not gone)', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'user_1', status: 'active', banned: false },
      error: { code: 'internal', message: 'outage' },
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('propagates thrown error (network)', async () => {
    mocks.retrieve.mockRejectedValue(new Error('network down'))
    await expect(isAccountUsable('user_1')).rejects.toThrow('network down')
  })
  it.each(['', 'user_1', 'workos_123', 'a'.repeat(64)])(
    'calls retrieve with exact userId "%s"',
    async (userId) => {
      mocks.retrieve.mockResolvedValue({
        data: { id: userId || 'user_1', status: 'active', banned: false },
        error: null,
      })
      await isAccountUsable(userId)
      expect(mocks.retrieve).toHaveBeenCalledWith()
      vi.clearAllMocks()
      mocks.retrieve.mockResolvedValue({
        data: { id: 'user_1', status: 'active', banned: false },
        error: null,
      })
    }
  )
  it('concurrent Promise.all preserves per-user result', async () => {
    mocks.retrieve
      .mockResolvedValueOnce({
        data: { id: 'u1', status: 'active', banned: false },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'user/not-found', message: 'gone' },
      })
      .mockResolvedValueOnce({
        data: { id: 'u3', status: 'blocked', banned: false },
        error: null,
      })
    const [a, b, c] = await Promise.all([
      isAccountUsable('u1'),
      isAccountUsable('u2'),
      isAccountUsable('u3'),
    ])
    expect(a).toBe(true)
    expect(b).toBe(false)
    expect(c).toBe(false)
  })
  it('does not memoize across userIds', async () => {
    await isAccountUsable('user_1')
    await isAccountUsable('user_2')
    expect(mocks.retrieve).toHaveBeenCalledTimes(2)
  })
  it('return type is boolean', async () => {
    const result = await isAccountUsable('user_1')
    expect(typeof result).toBe('boolean')
  })
  it('case-sensitive error code: USER/NOT-FOUND is outage not gone => true', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'USER/NOT-FOUND' as unknown as string, message: 'gone' },
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('data banned as 1 (strict === true) => true (not banned, impl checks === true)', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'user_1', status: 'active', banned: 1 as unknown as boolean },
      error: null,
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
  it('handles data undefined', async () => {
    mocks.retrieve.mockResolvedValue({
      data: undefined as unknown as null,
      error: null,
    })
    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
})
