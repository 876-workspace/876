import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ManageContext, Signed876Session } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  getManageContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))
vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))

import LegacyAppRedirect from './page'

const SECURITY_SEGMENTS = [
  ['XSS', '<script>alert(1)</script>'],
  ['SQL injection', "' OR '1'='1"],
  ['path traversal', '../../etc/passwd'],
  ['prototype key', '__proto__'],
  ['empty string', ''],
  ['10k characters', 'a'.repeat(10_000)],
] as const

function createSession(
  overrides: Partial<Signed876Session> = {}
): Signed876Session {
  return {
    user: {
      id: 'user_kingston_123',
      email: 'althea@islandlogistics.test',
      orgId: null,
    },
    accessToken: 'access_kingston_123',
    ...overrides,
  }
}

function createManageContext(
  overrides: Partial<ManageContext> = {}
): ManageContext {
  return {
    userId: 'user_kingston_123',
    orgId: 'organization_island_123',
    orgName: 'Island Logistics',
    orgSlug: 'island-logistics',
    organizations: [],
    tenant: null,
    role: 'owner',
    accessStatus: 'active',
    ...overrides,
  }
}

describe('LegacyAppRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
    mocks.getAuthSession.mockResolvedValue({
      user: {
        id: 'user_kingston_123',
        email: 'althea@islandlogistics.test',
        orgId: null,
      },
    })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.getManageContext.mockResolvedValue({
      userId: 'user_kingston_123',
      orgId: 'organization_island_123',
      orgName: 'Island Logistics',
      orgSlug: 'island-logistics',
      organizations: [],
      tenant: null,
      role: 'owner',
      accessStatus: 'active',
    })
  })

  it('redirects the legacy onboarding path without reading auth state', async () => {
    const action = LegacyAppRedirect({
      params: Promise.resolve({ rest: ['onboarding'] }),
    })

    await expect(action).rejects.toMatchObject({ path: '/onboarding' })
    expect(mocks.getAuthSession).not.toHaveBeenCalled()
    expect(mocks.isSignedSession).not.toHaveBeenCalled()
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/onboarding')
  })

  it('redirects an unsigned visitor to login with the root return path', async () => {
    const session = createSession()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(false)

    const action = LegacyAppRedirect({
      params: Promise.resolve({ rest: ['packages'] }),
    })

    await expect(action).rejects.toMatchObject({
      path: '/login?returnTo=/',
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/login?returnTo=/')
  })

  it('redirects a signed visitor without context to onboarding', async () => {
    const session = createSession()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.getManageContext.mockResolvedValue(null)

    const action = LegacyAppRedirect({
      params: Promise.resolve({ rest: ['packages'] }),
    })

    await expect(action).rejects.toMatchObject({ path: '/onboarding' })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/onboarding')
  })

  it('redirects an empty legacy rest array to the organization root', async () => {
    const context = createManageContext()
    mocks.getManageContext.mockResolvedValue(context)

    const action = LegacyAppRedirect({
      params: Promise.resolve({ rest: [] }),
    })

    await expect(action).rejects.toMatchObject({
      path: '/org/island-logistics',
    })
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/org/island-logistics')
  })

  it('uses an empty rest array when the optional catch-all is omitted', async () => {
    const context = createManageContext()
    mocks.getManageContext.mockResolvedValue(context)

    const action = LegacyAppRedirect({ params: Promise.resolve({}) })

    await expect(action).rejects.toMatchObject({
      path: '/org/island-logistics',
    })
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/org/island-logistics')
  })

  it('preserves all legacy path segments below the organization root', async () => {
    const context = createManageContext()
    mocks.getManageContext.mockResolvedValue(context)

    const action = LegacyAppRedirect({
      params: Promise.resolve({ rest: ['packages', 'pre-alerts'] }),
    })

    await expect(action).rejects.toMatchObject({
      path: '/org/island-logistics/packages/pre-alerts',
    })
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/org/island-logistics/packages/pre-alerts'
    )
  })

  it.each(SECURITY_SEGMENTS)(
    'handles the %s legacy segment deterministically',
    async (_case, segment) => {
      const context = createManageContext()
      mocks.getManageContext.mockResolvedValue(context)

      const action = LegacyAppRedirect({
        params: Promise.resolve({ rest: [segment] }),
      })

      await expect(action).rejects.toMatchObject({
        path: `/org/island-logistics/${segment}`,
      })
      expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
      expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
      expect(mocks.getManageContext).toHaveBeenCalledWith()
      expect(mocks.redirect).toHaveBeenCalledTimes(1)
      expect(mocks.redirect).toHaveBeenCalledWith(
        `/org/island-logistics/${segment}`
      )
    }
  )
})
