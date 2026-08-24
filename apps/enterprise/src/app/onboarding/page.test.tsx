import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireSession: vi.fn(),
  findAuthRoutingUser: vi.fn(),
  resolvePrimaryOrganizationPath: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/guards', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, requireSession: mocks.requireSession, findAuthRoutingUser: mocks.findAuthRoutingUser, resolvePrimaryOrganizationPath: mocks.resolvePrimaryOrganizationPath }
})

import OrganizationOnboardingPage from './page'

function redirectErr(path: string) { const e = Object.assign(new Error(path), { path, digest: `NEXT_REDIRECT:${path}` }); throw e }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.redirect.mockImplementation((p: string) => { throw redirectErr(p) })
  mocks.requireSession.mockResolvedValue({ id: 'user_1', realm: 'enterprise' })
  mocks.findAuthRoutingUser.mockResolvedValue({ id: 'user_1', email: 'a@b.co' })
  mocks.resolvePrimaryOrganizationPath.mockResolvedValue(null)
})

describe('OrganizationOnboardingPage — redirects to /register when no org (diff invariant)', () => {
  it('requires session with /onboarding returnTo', async () => {
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({ path: '/register' })
    expect(mocks.requireSession).toHaveBeenCalledWith('/onboarding')
  })

  it('redirects to Enterprise login when user is no longer local', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({ path: '/login?returnTo=%2Fonboarding' })
  })

  it('redirects to org profile when user has primary org', async () => {
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue('/acme/profile')
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({ path: '/acme/profile' })
  })

  it('redirects to /register when no primary org — never renders inline UI (diff)', async () => {
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue(null)
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({ path: '/register' })
    expect(mocks.redirect).toHaveBeenCalledWith('/register')
  })

  it('is idempotent: repeated calls resolve same destination', async () => {
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({ path: '/register' })
    mocks.redirect.mockClear()
    mocks.redirect.mockImplementation((p: string) => { throw redirectErr(p) })
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({ path: '/register' })
  })
})
