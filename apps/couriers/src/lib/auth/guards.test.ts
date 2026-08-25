import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Signed876Session } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  isAccountUsable: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T>(fn: T) => fn }
})
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('./account-validity', () => ({
  isAccountUsable: mocks.isAccountUsable,
}))

import { requireSession, requireValidSession } from './guards'

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

describe('Couriers auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue(signedSession())
    mocks.isSignedSession.mockReturnValue(true)
    mocks.isAccountUsable.mockResolvedValue(true)
  })

  it('returns the signed session user without checking account validity', async () => {
    const user = await requireSession('/acme')

    expect(user.id).toBe('user_2kL9mN4q')
    expect(mocks.isAccountUsable).not.toHaveBeenCalled()
  })

  it('redirects an unsigned session to embedded login', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    await expect(requireSession('/acme')).rejects.toThrow(
      'REDIRECT:/login?returnTo=%2Facme'
    )
  })

  it('returns the session user when the account remains usable', async () => {
    const user = await requireValidSession('/acme')

    expect(user.id).toBe('user_2kL9mN4q')
    expect(mocks.isAccountUsable).toHaveBeenCalledWith('user_2kL9mN4q')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects before account lookup when the cookie is unsigned', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    await expect(requireValidSession('/acme')).rejects.toThrow(
      'REDIRECT:/login?returnTo=%2Facme'
    )
    expect(mocks.isAccountUsable).not.toHaveBeenCalled()
  })

  it('redirects when the account-validity helper rejects the account', async () => {
    mocks.isAccountUsable.mockResolvedValue(false)

    await expect(requireValidSession('/acme')).rejects.toThrow(
      'REDIRECT:/login?returnTo=%2Facme'
    )
    expect(mocks.isAccountUsable).toHaveBeenCalledWith('user_2kL9mN4q')
  })
})
