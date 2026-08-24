import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ listRouting: vi.fn() }))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: vi.fn(async () => ({
    memberships: { listRouting: mocks.listRouting },
  })),
}))

import { resolveHomePathForUser } from './guards'

describe('resolveHomePathForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listRouting.mockResolvedValue({
      data: { data: [] },
      error: null,
    })
  })

  it('sends an enterprise user without memberships to workspace setup', async () => {
    await expect(resolveHomePathForUser('user_1')).resolves.toBe('/onboarding')
  })
})
