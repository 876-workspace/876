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

describe('RootPage — home resolver', () => {
  it('redirects to org profile when user has org', async () => {
    await expect(RootPage()).rejects.toMatchObject({ path: '/acme/profile' })
  })
  it('redirects to /register when user has no org', async () => {
    mocks.resolveHomePathForUser.mockResolvedValue('/register')
    await expect(RootPage()).rejects.toMatchObject({ path: '/register' })
  })
  it('redirects to Enterprise login when the session user is no longer local', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(RootPage()).rejects.toMatchObject({ path: '/login?returnTo=%2F' })
  })
})
