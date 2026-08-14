import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Signed876Session } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getPlatformClient: vi.fn(),
  retrieveUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T>(fn: T) => fn }
})
vi.mock('@876/core/auth/return-to', () => ({
  AUTH_RETURN_TO_PARAM: 'returnTo',
}))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { requireValidSession } from './guards'

function signedSession(): Signed876Session {
  return {
    user: {
      id: 'user_2kL9mN4q',
      email: 'alejandra@example.com',
      realm: 'enterprise',
      orgId: null,
      firstName: 'Alejandra',
      lastName: 'Reyes',
      emailVerified: true,
      avatar: null,
      username: 'alejandra',
    },
    accessToken: 'tok_abc',
  } as unknown as Signed876Session
}

function platformUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_2kL9mN4q',
    workos_user_id: 'workos_user_1',
    email: 'alejandra@example.com',
    first_name: 'Alejandra',
    last_name: 'Reyes',
    avatar: null,
    avatar_file_id: null,
    role: 'user',
    permissions: [],
    status: 'active',
    banned: false,
    ...overrides,
  }
}

describe('requireValidSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue(signedSession())
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getPlatformClient.mockResolvedValue({
      users: { retrieve: mocks.retrieveUser },
    })
  })

  it('returns the session user when the account exists and is active', async () => {
    mocks.retrieveUser.mockResolvedValue({ data: platformUser(), error: null })

    const user = await requireValidSession('/acme')

    expect(user.id).toBe('user_2kL9mN4q')
    expect(mocks.retrieveUser).toHaveBeenCalledWith({ id: 'user_2kL9mN4q' })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects to login when the cookie is not a signed session', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    await expect(requireValidSession('/acme')).rejects.toThrow(
      'REDIRECT:/login?returnTo=%2Facme'
    )
    expect(mocks.retrieveUser).not.toHaveBeenCalled()
  })

  it('redirects to login when the account was deleted (user/not-found)', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: null,
      error: { code: 'user/not-found', message: 'No user.' },
    })

    await expect(requireValidSession('/acme')).rejects.toThrow(
      'REDIRECT:/login?returnTo=%2Facme'
    )
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
  })

  it('redirects to login when the account status is not active', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: platformUser({ status: 'suspended' }),
      error: null,
    })

    await expect(requireValidSession('/acme')).rejects.toThrow(
      'REDIRECT:/login?returnTo=%2Facme'
    )
  })

  it('redirects to login when the account is banned', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: platformUser({ banned: true }),
      error: null,
    })

    await expect(requireValidSession('/acme')).rejects.toThrow(
      'REDIRECT:/login?returnTo=%2Facme'
    )
  })

  it('does NOT sign the user out on a platform outage (non-not-found error)', async () => {
    mocks.retrieveUser.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'Upstream down.' },
    })

    const user = await requireValidSession('/acme')

    expect(user.id).toBe('user_2kL9mN4q')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
