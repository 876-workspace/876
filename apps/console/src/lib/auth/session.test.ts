import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  verifySession876: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
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

describe('Console auth session', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.cookies.mockResolvedValue({
      get: mocks.cookieGet,
      delete: mocks.cookieDelete,
    })
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
    expect(mocks.cookieGet).toHaveBeenCalledTimes(1)
    expect(mocks.cookieGet).toHaveBeenCalledWith('876-session')
    expect(mocks.verifySession876).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects when a signed-in session is required but the cookie is missing', async () => {
    const { getAuthSession } = await loadSessionModule()

    await expect(
      getAuthSession({ ensureSignedIn: true })
    ).rejects.toMatchObject({
      path: '/login',
    })
    expect(mocks.verifySession876).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })

  it('returns a signed-out session for a verified cookie without a user ID', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    mocks.verifySession876.mockResolvedValue({ accessToken: 'token_123' })
    const { getAuthSession } = await loadSessionModule()

    const result = await getAuthSession()

    expect(result).toEqual({ user: null })
    expect(mocks.verifySession876).toHaveBeenCalledTimes(1)
    expect(mocks.verifySession876).toHaveBeenCalledWith('sealed-cookie')
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('redirects when a required verified session has no user ID', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    mocks.verifySession876.mockResolvedValue(null)
    const { getAuthSession } = await loadSessionModule()

    await expect(
      getAuthSession({ ensureSignedIn: true })
    ).rejects.toMatchObject({
      path: '/login',
    })
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })

  it('maps every signed session field and defaults a missing email', async () => {
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
        firstName: 'Alejandra',
        lastName: 'Reyes',
      },
      accessToken: 'token_123',
    })
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('reads a configured cookie name at module initialization', async () => {
    vi.stubEnv('SESSION_COOKIE_NAME', 'console-session')
    const { getAuthSession } = await loadSessionModule()

    const result = await getAuthSession()

    expect(result).toEqual({ user: null })
    expect(mocks.cookieGet).toHaveBeenCalledWith('console-session')
  })

  it('returns null access token when the cookie is missing', async () => {
    const { getAccessToken } = await loadSessionModule()

    const result = await getAccessToken()

    expect(result).toBeNull()
    expect(mocks.verifySession876).not.toHaveBeenCalled()
  })

  it('returns null access token when verification has no token', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    mocks.verifySession876.mockResolvedValue({ userId: 'user_123' })
    const { getAccessToken } = await loadSessionModule()

    const result = await getAccessToken()

    expect(result).toBeNull()
    expect(mocks.verifySession876).toHaveBeenCalledTimes(1)
    expect(mocks.verifySession876).toHaveBeenCalledWith('sealed-cookie')
  })

  it('returns the verified access token', async () => {
    mocks.cookieGet.mockReturnValue({ value: 'sealed-cookie' })
    mocks.verifySession876.mockResolvedValue({
      userId: 'user_123',
      accessToken: 'token_123',
    })
    const { getAccessToken } = await loadSessionModule()

    const result = await getAccessToken()

    expect(result).toBe('token_123')
  })

  it('clears the session cookie with explicit root path', async () => {
    const { clearAuthSession } = await loadSessionModule()

    await clearAuthSession()

    expect(mocks.cookieDelete).toHaveBeenCalledTimes(1)
    expect(mocks.cookieDelete).toHaveBeenCalledWith({
      name: '876-session',
      path: '/',
    })
  })

  it('falls back to the string cookie deletion signature', async () => {
    mocks.cookieDelete
      .mockImplementationOnce(() => {
        throw new TypeError('Object signature unavailable')
      })
      .mockImplementationOnce(() => undefined)
    const { clearAuthSession } = await loadSessionModule()

    await clearAuthSession()

    expect(mocks.cookieDelete).toHaveBeenCalledTimes(2)
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(1, {
      name: '876-session',
      path: '/',
    })
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(2, '876-session')
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
