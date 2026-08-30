import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthSession: vi.fn(),
  isAccountUsable: vi.fn(),
}))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: { user?: unknown } | null) =>
    Boolean(session?.user),
}))
vi.mock('@/lib/auth/account-validity', () => ({
  isAccountUsable: mocks.isAccountUsable,
}))
vi.mock('./_components/embedded-auth', () => ({
  EmbeddedAuth: ({ returnTo }: { returnTo: string }) => (
    <div data-testid="embedded-auth">{returnTo}</div>
  ),
}))
import OrgLoginPage from './page'
function redirectError(path: string) {
  return Object.assign(new Error(`redirect:${path}`), {
    path,
    digest: `NEXT_REDIRECT:${path}`,
  })
}
function signedSession(
  realm: 'consumer' | 'enterprise',
  overrides: Partial<{ id: string; crossRealm: boolean }> = {}
) {
  return {
    user: {
      id: overrides.id ?? 'user_1',
      realm,
      crossRealm: overrides.crossRealm ?? false,
    },
  }
}
describe('OrgLoginPage — account-validity + realm gate (goldbergyoni AAA)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw redirectError(path)
    })
    mocks.isAccountUsable.mockResolvedValue(true)
  })
  it('blocks usable consumer session (diff invariant)', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('consumer'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({}) })
    ).rejects.toMatchObject({ path: '/access-denied' })
    expect(mocks.isAccountUsable).toHaveBeenCalledWith('user_1')
  })
  it('blocks consumer even with returnTo present', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('consumer'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '/acme' }) })
    ).rejects.toMatchObject({ path: '/access-denied' })
    expect(mocks.redirect.mock.calls[0]?.[0] as string).toBe('/access-denied')
  })
  it('allows crossRealm consumer (owner) to pass as enterprise', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession('consumer', { crossRealm: true })
    )
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '/acme' }) })
    ).rejects.toMatchObject({ path: '/acme' })
  })
  it('redirects usable Enterprise to requested destination', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '/acme' }) })
    ).rejects.toMatchObject({ path: '/acme' })
  })
  it('defaults returnTo to "/" when none provided', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({}) })
    ).rejects.toMatchObject({ path: '/' })
  })
  it.each([
    ['/acme', '/acme'],
    ['/acme/profile', '/acme/profile'],
    ['/', '/'],
    ['/a-b_c', '/a-b_c'],
  ])('preserves valid relative returnTo "%s"', async (input, expected) => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: input }) })
    ).rejects.toMatchObject({ path: expected })
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((p: string) => {
      throw redirectError(p)
    })
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    mocks.isAccountUsable.mockResolvedValue(true)
  })
  it.each([
    ['https://evil.com', '/'],
    ['//evil.com', '/'],
    ['/\\evil', '/'],
    ['/login', '/'],
    ['/register', '/'],
    ['/recover', '/'],
    ['/reset-password', '/'],
  ])('sanitizes unsafe returnTo "%s" to "/"', async (input, expected) => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: input }) })
    ).rejects.toMatchObject({ path: expected })
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((p: string) => {
      throw redirectError(p)
    })
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    mocks.isAccountUsable.mockResolvedValue(true)
  })
  it('sanitizes returnTo with query on blocked path', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({
        searchParams: Promise.resolve({ returnTo: '/login?x=1' }),
      })
    ).rejects.toMatchObject({ path: '/' })
  })
  it('keeps stale Enterprise session on login form (not redirect)', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    mocks.isAccountUsable.mockResolvedValue(false)
    const node = await OrgLoginPage({ searchParams: Promise.resolve({}) })
    render(node)
    expect(screen.getByTestId('embedded-auth')).toBeInTheDocument()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it('keeps stale consumer session on form — not /access-denied', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('consumer'))
    mocks.isAccountUsable.mockResolvedValue(false)
    const node = await OrgLoginPage({
      searchParams: Promise.resolve({ returnTo: '/acme' }),
    })
    render(node)
    expect(screen.getByTestId('embedded-auth')).toBeInTheDocument()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it('shows embedded auth with sanitized returnTo when stale', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    mocks.isAccountUsable.mockResolvedValue(false)
    const node = await OrgLoginPage({
      searchParams: Promise.resolve({ returnTo: '/acme' }),
    })
    render(node)
    expect(screen.getByTestId('embedded-auth').textContent).toBe('/acme')
  })
  it('shows embedded auth fallback "/" when stale and blocked', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    mocks.isAccountUsable.mockResolvedValue(false)
    const node = await OrgLoginPage({
      searchParams: Promise.resolve({ returnTo: '/login' }),
    })
    render(node)
    expect(screen.getByTestId('embedded-auth').textContent).toBe('/')
  })
  it('shows login form for unauthenticated', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: null } as never)
    const node = await OrgLoginPage({ searchParams: Promise.resolve({}) })
    render(node)
    expect(screen.getByTestId('embedded-auth')).toBeInTheDocument()
    expect(mocks.isAccountUsable).not.toHaveBeenCalled()
  })
  it('shows login form with requested returnTo preserved', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: null } as never)
    const node = await OrgLoginPage({
      searchParams: Promise.resolve({ returnTo: '/acme/profile' }),
    })
    render(node)
    expect(screen.getByTestId('embedded-auth').textContent).toBe(
      '/acme/profile'
    )
  })
  it('does not check isAccountUsable when no session', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: null } as never)
    const node = await OrgLoginPage({ searchParams: Promise.resolve({}) })
    render(node)
    expect(mocks.isAccountUsable).not.toHaveBeenCalled()
  })
  it('uses first value when returnTo is array', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({
        searchParams: Promise.resolve({ returnTo: ['/acme', '/other'] }),
      })
    ).rejects.toMatchObject({ path: '/acme' })
  })
  it('treats empty returnTo as fallback "/"', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '' }) })
    ).rejects.toMatchObject({ path: '/' })
  })
  it('trims whitespace from returnTo', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '  /acme  ' }) })
    ).rejects.toMatchObject({ path: '/acme' })
  })
  it('handles missing searchParams returnTo gracefully', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({}) })
    ).rejects.toMatchObject({ path: '/' })
  })
  it('ignores authError param (does not affect returnTo)', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    await expect(
      OrgLoginPage({
        searchParams: Promise.resolve({
          authError: 'x',
          returnTo: '/acme',
        } as never),
      })
    ).rejects.toMatchObject({ path: '/acme' })
  })
  it('when isAccountUsable throws, page throws (not swallowed)', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    mocks.isAccountUsable.mockRejectedValue(new Error('platform outage'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow('platform outage')
  })
  it('when getAuthSession throws, page throws', async () => {
    mocks.getAuthSession.mockRejectedValue(new Error('session store down'))
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow('session store down')
  })
  it('redirect carries NEXT_REDIRECT digest', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    try {
      await OrgLoginPage({
        searchParams: Promise.resolve({ returnTo: '/acme' }),
      })
    } catch (e: unknown) {
      expect((e as { digest: string }).digest).toBe('NEXT_REDIRECT:/acme')
    }
  })
  it('consumer block is exactly /access-denied (relative, no leakage)', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('consumer'))
    try {
      await OrgLoginPage({ searchParams: Promise.resolve({}) })
    } catch (e: unknown) {
      const path = (e as { path: string }).path
      expect(path).toBe('/access-denied')
      expect(path).not.toMatch(/^https?:\/\//)
    }
  })
  it('concurrent login checks isolated', async () => {
    mocks.getAuthSession
      .mockResolvedValueOnce(signedSession('enterprise'))
      .mockResolvedValueOnce(signedSession('consumer'))
    mocks.isAccountUsable.mockResolvedValue(true)
    const a = OrgLoginPage({
      searchParams: Promise.resolve({ returnTo: '/a' }),
    })
    const b = OrgLoginPage({
      searchParams: Promise.resolve({ returnTo: '/b' }),
    })
    const [ra, rb] = await Promise.allSettled([a, b])
    expect(ra.status).toBe('rejected')
    expect(rb.status).toBe('rejected')
    expect((ra as PromiseRejectedResult).reason.path).toBe('/a')
    expect((rb as PromiseRejectedResult).reason.path).toBe('/access-denied')
  })
  it('stale enterprise with crossRealm does not redirect', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession('enterprise', { crossRealm: true })
    )
    mocks.isAccountUsable.mockResolvedValue(false)
    const node = await OrgLoginPage({
      searchParams: Promise.resolve({ returnTo: '/acme' }),
    })
    render(node)
    expect(screen.getByTestId('embedded-auth')).toBeInTheDocument()
  })
  it('usable enterprise with different userId still checks that userId', async () => {
    mocks.getAuthSession.mockResolvedValue(
      signedSession('enterprise', { id: 'user_99' })
    )
    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '/x' }) })
    ).rejects.toMatchObject({ path: '/x' })
    expect(mocks.isAccountUsable).toHaveBeenCalledWith('user_99')
  })
})
