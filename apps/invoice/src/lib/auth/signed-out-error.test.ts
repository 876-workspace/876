import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`)
  }),
}))

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

const { isSignedOutError, redirectIfSignedOut } =
  await import('./signed-out-error')

describe('isSignedOutError', () => {
  it.each([
    'auth/invalid-token',
    'auth/no-session',
    'auth/session-expired',
    'auth/unauthorized',
  ])('treats %s as a signed-out verdict', (code) => {
    expect(isSignedOutError(code)).toBe(true)
  })

  it.each([
    'billing/tenant-not-found',
    'billing/unreachable',
    'auth/forbidden',
    'api/internal-error',
  ])('does not treat %s as a signed-out verdict', (code) => {
    expect(isSignedOutError(code)).toBe(false)
  })

  it.each([null, undefined, ''])('returns false for %s', (code) => {
    expect(isSignedOutError(code)).toBe(false)
  })
})

describe('redirectIfSignedOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login with the encoded return path', () => {
    expect(() =>
      redirectIfSignedOut('auth/invalid-token', '/customers')
    ).toThrow('REDIRECT:/login?returnTo=%2Fcustomers')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
  })

  it('does not redirect for a provisioning error', () => {
    expect(() =>
      redirectIfSignedOut('billing/tenant-not-found', '/customers')
    ).not.toThrow()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('does not redirect when there is no error code', () => {
    expect(() => redirectIfSignedOut(undefined, '/customers')).not.toThrow()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
