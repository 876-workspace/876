import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  verifySession876: vi.fn(),
  cookieGet: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('./session-cookie', () => ({
  verifySession876: mocks.verifySession876,
}))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }
})

async function loadSessionModule() {
  return import('./session')
}

describe('Billing auth session', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.cookies.mockResolvedValue({ get: mocks.cookieGet })
    mocks.cookieGet.mockReturnValue(undefined)
    mocks.verifySession876.mockResolvedValue(null)
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns a signed-out session when the cookie is missing', async () => {
    const { getAuthSession } = await loadSessionModule()

    const result = await getAuthSession()

    expect(result).toEqual({ user: null })
    expect(mocks.cookieGet).toHaveBeenCalledWith('876-session')
    expect(mocks.verifySession876).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects when a session is required and the cookie is missing', async () => {
    const { getAuthSession } = await loadSessionModule()

    await expect(
      getAuthSession({ ensureSignedIn: true })
    ).rejects.toMatchObject({
      path: '/login',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })

  it('returns signed out for a verified cookie without a user ID', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    mocks.verifySession876.mockResolvedValue({ accessToken: 'token_123' })
    const { getAuthSession } = await loadSessionModule()

    const result = await getAuthSession()

    expect(result).toEqual({ user: null })
    expect(mocks.verifySession876).toHaveBeenCalledWith('sealed-cookie')
  })

  it('redirects when a required verified session has no user ID', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    const { getAuthSession } = await loadSessionModule()

    await expect(
      getAuthSession({ ensureSignedIn: true })
    ).rejects.toMatchObject({
      path: '/login',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
  })

  it('maps signed session fields and defaults nullable display values', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    mocks.verifySession876.mockResolvedValue({
      userId: 'user_123',
      accountType: 'enterprise',
      firstName: 'Alejandra',
      lastName: 'Reyes',
      accessToken: 'token_123',
    })
    const { getAuthSession } = await loadSessionModule()

    const result = await getAuthSession()

    expect(result).toEqual({
      user: {
        id: 'user_123',
        email: '',
        accountType: 'enterprise',
        orgId: null,
        firstName: 'Alejandra',
        lastName: 'Reyes',
        avatar: null,
      },
      accessToken: 'token_123',
    })
  })

  it('preserves populated email, organization, and avatar fields', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    mocks.verifySession876.mockResolvedValue({
      userId: 'user_123',
      email: 'alejandra@example.com',
      orgId: 'org_123',
      avatar: 'https://cdn.example.com/avatar.png',
    })
    const { getAuthSession } = await loadSessionModule()

    const result = await getAuthSession()

    expect(result).toEqual({
      user: {
        id: 'user_123',
        email: 'alejandra@example.com',
        accountType: undefined,
        orgId: 'org_123',
        firstName: undefined,
        lastName: undefined,
        avatar: 'https://cdn.example.com/avatar.png',
      },
      accessToken: undefined,
    })
  })

  it('reads a configured cookie name at module initialization', async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', 'billing-session')
    const { getAuthSession } = await loadSessionModule()

    const result = await getAuthSession()

    expect(result).toEqual({ user: null })
    expect(mocks.cookieGet).toHaveBeenCalledWith('billing-session')
  })

  it.each([
    [{ user: null }, false],
    [{ user: undefined }, false],
    [{ user: { id: 'user_123', email: '' } }, true],
  ])('classifies session %j as signed=%s', async (session, expected) => {
    const { isSignedSession } = await loadSessionModule()

    const result = isSignedSession(session as never)

    expect(result).toBe(expected)
  })
})
