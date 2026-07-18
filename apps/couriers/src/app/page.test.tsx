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

import HomePage from './page'

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
    organizations: [
      {
        id: 'organization_island_123',
        name: 'Island Logistics',
        slug: 'island-logistics',
        role: 'owner',
      },
    ],
    tenant: null,
    role: 'owner',
    accessStatus: 'active',
    ...overrides,
  }
}

describe('HomePage', () => {
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

  it('redirects an unsigned visitor to login without resolving context', async () => {
    const session = createSession()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.isSignedSession.mockReturnValue(false)

    const action = HomePage()

    await expect(action).rejects.toMatchObject({ path: '/login' })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })

  it('redirects a signed visitor without context to onboarding', async () => {
    const session = createSession()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.getManageContext.mockResolvedValue(null)

    const action = HomePage()

    await expect(action).rejects.toMatchObject({ path: '/onboarding' })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/onboarding')
  })

  it('redirects a resolved context to its organization root', async () => {
    const session = createSession()
    const context = createManageContext()
    mocks.getAuthSession.mockResolvedValue(session)
    mocks.getManageContext.mockResolvedValue(context)

    const action = HomePage()

    await expect(action).rejects.toMatchObject({
      path: '/org/island-logistics',
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledWith(session)
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith()
    expect(mocks.redirect).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/org/island-logistics')
  })
})
