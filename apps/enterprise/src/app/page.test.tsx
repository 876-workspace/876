import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireSession: vi.fn(),
  findAuthRoutingUser: vi.fn(),
  resolveHomePathForUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/guards', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    requireSession: mocks.requireSession,
    findAuthRoutingUser: mocks.findAuthRoutingUser,
    resolveHomePathForUser: mocks.resolveHomePathForUser,
  }
})

import RootPage from './page'

function redirectErr(path: string) {
  const e = Object.assign(new Error(path), {
    path,
    digest: `NEXT_REDIRECT:${path}`,
  })
  throw e
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.redirect.mockImplementation((p: string) => {
    throw redirectErr(p)
  })
  mocks.requireSession.mockResolvedValue({ id: 'user_1' })
  mocks.findAuthRoutingUser.mockResolvedValue({ id: 'user_1', email: 'a@b.co' })
  mocks.resolveHomePathForUser.mockResolvedValue('/acme/profile')
})

describe('RootPage — home resolver (goldbergyoni AAA, isolated)', () => {
  it('redirects to org profile when user has org', async () => {
    await expect(RootPage()).rejects.toMatchObject({ path: '/acme/profile' })
  })
  it('redirects to /register when user has no org — diff never /no-access', async () => {
    mocks.resolveHomePathForUser.mockResolvedValue('/register')
    await expect(RootPage()).rejects.toMatchObject({ path: '/register' })
  })
  it('diff: redirects to /login?returnTo=%2F when session user no longer local (not /register)', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(RootPage()).rejects.toMatchObject({
      path: '/login?returnTo=%2F',
    })
    expect(mocks.redirect.mock.calls[0]?.[0] as string).toBe(
      '/login?returnTo=%2F'
    )
  })
  it('redirect target for missing user is exactly /login?returnTo=%2F (encoded, relative)', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    try {
      await RootPage()
    } catch {}
    const path = mocks.redirect.mock.calls[0]?.[0] as string
    expect(path).toBe('/login?returnTo=%2F')
    expect(path).not.toMatch(/^https?:\/\//)
  })
  it('requires session with returnTo "/"', async () => {
    await expect(RootPage()).rejects.toBeDefined()
    expect(mocks.requireSession).toHaveBeenCalledWith('/')
  })
  it('resolves auth routing user with sessionUser.id', async () => {
    mocks.requireSession.mockResolvedValue({ id: 'workos_abc' } as never)
    mocks.findAuthRoutingUser.mockResolvedValue({
      id: 'local_123',
      email: 'x@y.co',
    } as never)
    mocks.resolveHomePathForUser.mockResolvedValue('/acme/profile')
    try {
      await RootPage()
    } catch {}
    expect(mocks.findAuthRoutingUser).toHaveBeenCalledWith('workos_abc')
    expect(mocks.resolveHomePathForUser).toHaveBeenCalledWith('local_123')
  })
  it('short-circuits when requireSession redirects', async () => {
    mocks.requireSession.mockImplementation(() => {
      throw redirectErr('/login?returnTo=%2F')
    })
    await expect(RootPage()).rejects.toMatchObject({
      path: '/login?returnTo=%2F',
    })
    expect(mocks.findAuthRoutingUser).not.toHaveBeenCalled()
  })
  it('short-circuits when user missing', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(RootPage()).rejects.toMatchObject({
      path: '/login?returnTo=%2F',
    })
    expect(mocks.resolveHomePathForUser).not.toHaveBeenCalled()
  })
  it('propagates platform error from findAuthRoutingUser', async () => {
    mocks.findAuthRoutingUser.mockRejectedValue(new Error('platform outage'))
    await expect(RootPage()).rejects.toThrow('platform outage')
  })
  it('propagates platform error from resolveHomePathForUser', async () => {
    mocks.resolveHomePathForUser.mockRejectedValue(new Error('db down'))
    await expect(RootPage()).rejects.toThrow('db down')
  })
  it('propagates error from requireSession', async () => {
    mocks.requireSession.mockRejectedValue(new Error('session store down'))
    await expect(RootPage()).rejects.toThrow('session store down')
  })
  it('redirect carries NEXT_REDIRECT digest', async () => {
    try {
      await RootPage()
    } catch (e: unknown) {
      expect((e as { digest?: string }).digest).toBe(
        `NEXT_REDIRECT:${(e as { path: string }).path}`
      )
    }
  })
  it('redirect is relative', async () => {
    try {
      await RootPage()
    } catch (e: unknown) {
      expect((e as { path: string }).path.startsWith('/')).toBe(true)
    }
  })
  it('concurrent calls isolated', async () => {
    mocks.resolveHomePathForUser
      .mockResolvedValueOnce('/acme/profile' as never)
      .mockResolvedValueOnce('/other/profile' as never)
    const [a, b] = await Promise.allSettled([RootPage(), RootPage()])
    const paths = [a, b].map(
      (r) => (r as PromiseRejectedResult).reason.path as string
    )
    expect(new Set(paths)).toEqual(new Set(['/acme/profile', '/other/profile']))
  })
  it('is idempotent', async () => {
    const first = await RootPage().catch((e) => (e as { path: string }).path)
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((p: string) => {
      throw redirectErr(p)
    })
    mocks.requireSession.mockResolvedValue({ id: 'user_1' } as never)
    mocks.findAuthRoutingUser.mockResolvedValue({
      id: 'user_1',
      email: 'a@b.co',
    } as never)
    mocks.resolveHomePathForUser.mockResolvedValue('/acme/profile' as never)
    const second = await RootPage().catch((e) => (e as { path: string }).path)
    expect(first).toBe(second)
  })
  it.each([
    ['/acme/profile', '/acme/profile'],
    ['/register', '/register'],
  ])('forwards resolveHomePathForUser "%s"', async (path) => {
    mocks.resolveHomePathForUser.mockResolvedValue(path as never)
    await expect(RootPage()).rejects.toMatchObject({ path })
  })
  it('never redirects to /register for missing user', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(RootPage()).rejects.not.toMatchObject({ path: '/register' })
    await expect(RootPage().catch((e) => e)).resolves.toBeDefined()
  })
  it('calls resolveHomePathForUser exactly once', async () => {
    await expect(RootPage()).rejects.toBeDefined()
    expect(mocks.resolveHomePathForUser).toHaveBeenCalledTimes(1)
  })
})
