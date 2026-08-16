import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAuthSession, mockRedirect, mockUsersRetrieve } = vi.hoisted(
  () => ({
    mockGetAuthSession: vi.fn(),
    mockRedirect: vi.fn((target: string) => {
      throw new Error(`REDIRECT:${target}`)
    }),
    mockUsersRetrieve: vi.fn(),
  })
)

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, cache: <T>(fn: T) => fn }
})

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: async () => ({ users: { retrieve: mockUsersRetrieve } }),
}))

vi.mock('./session', () => ({
  getAuthSession: mockGetAuthSession,
  isSignedSession: (session: { user: unknown }) =>
    session.user !== null && session.user !== undefined,
}))

const { requireValidSession } = await import('./guards')

const SIGNED_IN = {
  user: { id: 'user_2kL9mN4q', email: 'alejandra@example.com' },
}

function platformUser(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: 'user_2kL9mN4q',
      email: 'alejandra@example.com',
      status: 'active',
      banned: false,
      ...overrides,
    },
    error: null,
  }
}

describe('requireValidSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthSession.mockResolvedValue(SIGNED_IN)
    mockUsersRetrieve.mockResolvedValue(platformUser())
  })

  describe('happy path', () => {
    it('returns the session user for an active account', async () => {
      const user = await requireValidSession('/customers')

      expect(user).toEqual(SIGNED_IN.user)
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(mockUsersRetrieve).toHaveBeenCalledTimes(1)
      expect(mockUsersRetrieve).toHaveBeenCalledWith({ id: 'user_2kL9mN4q' })
    })
  })

  describe('signed out', () => {
    it('redirects to login without calling the identity API', async () => {
      mockGetAuthSession.mockResolvedValue({ user: null })

      await expect(requireValidSession('/customers')).rejects.toThrow(
        'REDIRECT:/login?returnTo=%2Fcustomers'
      )
      expect(mockUsersRetrieve).not.toHaveBeenCalled()
    })
  })

  describe('the account is no longer usable', () => {
    it('redirects to login when the account was purged', async () => {
      mockUsersRetrieve.mockResolvedValue({
        data: null,
        error: { code: 'user/not-found' },
      })

      await expect(requireValidSession('/customers')).rejects.toThrow(
        'REDIRECT:/login?returnTo=%2Fcustomers'
      )
    })

    it.each(['suspended', 'inactive'])(
      'redirects to login when the account status is %s',
      async (status) => {
        mockUsersRetrieve.mockResolvedValue(platformUser({ status }))

        await expect(requireValidSession('/customers')).rejects.toThrow(
          'REDIRECT:/login?returnTo=%2Fcustomers'
        )
      }
    )

    it('redirects to login when the account is banned', async () => {
      mockUsersRetrieve.mockResolvedValue(platformUser({ banned: true }))

      await expect(requireValidSession('/customers')).rejects.toThrow(
        'REDIRECT:/login?returnTo=%2Fcustomers'
      )
    })
  })

  describe('fails open on an identity-API outage', () => {
    it('keeps the session when the lookup fails for any other reason', async () => {
      mockUsersRetrieve.mockResolvedValue({
        data: null,
        error: { code: 'api/unreachable' },
      })

      const user = await requireValidSession('/customers')

      expect(user).toEqual(SIGNED_IN.user)
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('keeps the session when the account status is unknown', async () => {
      mockUsersRetrieve.mockResolvedValue(platformUser({ status: null }))

      const user = await requireValidSession('/customers')

      expect(user).toEqual(SIGNED_IN.user)
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('return-to handling', () => {
    it('defaults the return path to the app root', async () => {
      mockGetAuthSession.mockResolvedValue({ user: null })

      await expect(requireValidSession()).rejects.toThrow(
        'REDIRECT:/login?returnTo=%2F'
      )
    })
  })
})
