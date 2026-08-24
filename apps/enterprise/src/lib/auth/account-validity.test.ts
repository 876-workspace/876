import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }))

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: vi.fn(async () => ({
    users: { retrieve: mocks.retrieve },
  })),
}))
vi.mock('react', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, cache: (fn: unknown) => fn }
})

import { isAccountUsable } from './account-validity'

describe('isAccountUsable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accepts an active, unbanned account', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'user_1', status: 'active', banned: false },
      error: null,
    })

    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })

  it('rejects a deleted, suspended, or banned account', async () => {
    mocks.retrieve.mockResolvedValueOnce({
      data: null,
      error: { code: 'user/not-found' },
    })
    mocks.retrieve.mockResolvedValueOnce({
      data: { id: 'user_1', status: 'suspended', banned: false },
      error: null,
    })
    mocks.retrieve.mockResolvedValueOnce({
      data: { id: 'user_1', status: 'active', banned: true },
      error: null,
    })

    await expect(isAccountUsable('missing')).resolves.toBe(false)
    await expect(isAccountUsable('suspended')).resolves.toBe(false)
    await expect(isAccountUsable('banned')).resolves.toBe(false)
  })

  it('keeps an account usable during an identity-service outage', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'internal' },
    })

    await expect(isAccountUsable('user_1')).resolves.toBe(true)
  })
})
