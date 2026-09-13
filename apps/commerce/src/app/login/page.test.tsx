import { describe, expect, it, vi } from 'vitest'

const { mockIsAccountUsable, mockGetCommerceSession, mockRedirect } =
  vi.hoisted(() => ({
    mockIsAccountUsable: vi.fn(),
    mockGetCommerceSession: vi.fn(),
    mockRedirect: vi.fn(),
  }))

vi.mock('@/lib/auth/account-validity', () => ({
  isAccountUsable: mockIsAccountUsable,
}))
vi.mock('@/lib/auth/session', () => ({
  getCommerceSession: mockGetCommerceSession,
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('./_components/embedded-auth', () => ({
  EmbeddedAuth: ({ returnTo }: { returnTo: string }) => <div>{returnTo}</div>,
}))

const { default: LoginPage } = await import('./page')

describe('Commerce login page', () => {
  it('renders the login form rather than redirecting for a stale session', async () => {
    mockGetCommerceSession.mockResolvedValue({ userId: 'user_deleted' })
    mockIsAccountUsable.mockResolvedValue(false)

    const page = await LoginPage({ searchParams: Promise.resolve({}) })

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(page.props.returnTo).toBe('/')
  })
})
