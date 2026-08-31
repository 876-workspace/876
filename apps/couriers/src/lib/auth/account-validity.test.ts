import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPlatformClient: vi.fn(),
  retrieveUser: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T>(fn: T) => fn }
})

vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { isAccountUsable } from './account-validity'

function platformUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_2kL9mN4q',
    email: 'alejandra@example.com',
    status: 'active',
    banned: false,
    ...overrides,
  }
}

describe('isAccountUsable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPlatformClient.mockResolvedValue({
      users: { retrieve: mocks.retrieveUser },
    })
    mocks.retrieveUser.mockResolvedValue({
      data: platformUser(),
      error: null,
    })
  })

  it('accepts an active platform account', async () => {
    await expect(isAccountUsable('user_2kL9mN4q')).resolves.toBe(true)
    expect(mocks.retrieveUser).toHaveBeenCalledWith({ id: 'user_2kL9mN4q' })
  })

  it('rejects a deleted platform account', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: null,
      error: { code: 'user/not-found', message: 'No user.' },
    })

    await expect(isAccountUsable('user_2kL9mN4q')).resolves.toBe(false)
  })

  it.each([
    ['suspended status', { status: 'suspended' }],
    ['banned flag', { banned: true }],
  ])('rejects an account with %s', async (_name, overrides) => {
    mocks.retrieveUser.mockResolvedValue({
      data: platformUser(overrides),
      error: null,
    })

    await expect(isAccountUsable('user_2kL9mN4q')).resolves.toBe(false)
  })

  it('fails open for a non-not-found platform error', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'Upstream down.' },
    })

    await expect(isAccountUsable('user_2kL9mN4q')).resolves.toBe(true)
  })
})
