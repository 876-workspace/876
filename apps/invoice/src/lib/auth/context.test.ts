import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetAuthSession, mockIsAccountUsable, mockListRouting } = vi.hoisted(
  () => ({
    mockGetAuthSession: vi.fn(),
    mockIsAccountUsable: vi.fn(),
    mockListRouting: vi.fn(),
  })
)

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, cache: <T>(fn: T) => fn }
})

vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: async () => ({
    memberships: { listRouting: mockListRouting },
    subscriptions: { retrieve: vi.fn(async () => ({ data: null })) },
  }),
}))

vi.mock('./account-validity', () => ({ isAccountUsable: mockIsAccountUsable }))

vi.mock('./session', () => ({
  getAuthSession: mockGetAuthSession,
  isSignedSession: (session: { user: unknown }) =>
    session.user !== null && session.user !== undefined,
}))

const { getInvoiceContextResult } = await import('./context')

describe('getInvoiceContextResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthSession.mockResolvedValue({
      user: { id: 'user_2kL9mN4q', orgId: null },
    })
    mockIsAccountUsable.mockResolvedValue(true)
    mockListRouting.mockResolvedValue({ data: { data: [] }, error: null })
  })

  it('reports signed-out when there is no session cookie', async () => {
    mockGetAuthSession.mockResolvedValue({ user: null })

    await expect(getInvoiceContextResult()).resolves.toEqual({
      status: 'signed-out',
    })
    expect(mockIsAccountUsable).not.toHaveBeenCalled()
  })

  // The regression this test exists for: a purged account kept a valid sealed
  // cookie, resolved no memberships, and was reported as "no organization" —
  // which parks it on /onboarding, outside the guarded shell, forever.
  it('reports signed-out when the account behind a valid cookie is gone', async () => {
    mockIsAccountUsable.mockResolvedValue(false)

    await expect(getInvoiceContextResult()).resolves.toEqual({
      status: 'signed-out',
    })
    expect(mockIsAccountUsable).toHaveBeenCalledWith('user_2kL9mN4q')
  })

  it('does not resolve memberships for an unusable account', async () => {
    mockIsAccountUsable.mockResolvedValue(false)

    await getInvoiceContextResult()

    expect(mockListRouting).not.toHaveBeenCalled()
  })

  it('reports no-organization for a usable account with no memberships', async () => {
    await expect(getInvoiceContextResult()).resolves.toEqual({
      status: 'no-organization',
    })
  })
})
