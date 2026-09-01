import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ManageContext } from '@/types/auth'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireValidSession: vi.fn(),
  getManageContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/guards', () => ({
  requireValidSession: mocks.requireValidSession,
}))
vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))

import HomePage from './page'

function createManageContext(
  overrides: Partial<ManageContext> = {}
): ManageContext {
  return {
    userId: 'user_kingston_123',
    orgId: 'organization_island_123',
    orgName: 'Island Logistics',
    orgSlug: 'island-logistics',
    orgLogoUrl: null,
    organizations: [
      {
        id: 'organization_island_123',
        name: 'Island Logistics',
        slug: 'island-logistics',
        role: 'super-admin',
        logoUrl: null,
      },
    ],
    tenant: null,
    role: 'super-admin',
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
    mocks.requireValidSession.mockResolvedValue({
      id: 'user_kingston_123',
      email: 'althea@islandlogistics.test',
    })
    mocks.getManageContext.mockResolvedValue(createManageContext())
  })

  it('signs out a deleted or disabled visitor without resolving context', async () => {
    // requireValidSession redirects to /login itself for an invalid account.
    mocks.requireValidSession.mockImplementation(() => {
      throw Object.assign(new Error('redirect:/login'), { path: '/login' })
    })

    const action = HomePage()

    await expect(action).rejects.toMatchObject({ path: '/login' })
    expect(mocks.requireValidSession).toHaveBeenCalledTimes(1)
    expect(mocks.requireValidSession).toHaveBeenCalledWith('/')
    expect(mocks.getManageContext).not.toHaveBeenCalled()
  })

  it('redirects a valid visitor without context to onboarding', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const action = HomePage()

    await expect(action).rejects.toMatchObject({ path: '/onboarding' })
    expect(mocks.requireValidSession).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledWith()
    expect(mocks.redirect).toHaveBeenCalledWith('/onboarding')
  })

  it('redirects a resolved context to its organization root', async () => {
    mocks.getManageContext.mockResolvedValue(createManageContext())

    const action = HomePage()

    await expect(action).rejects.toMatchObject({ path: '/island-logistics' })
    expect(mocks.requireValidSession).toHaveBeenCalledTimes(1)
    expect(mocks.getManageContext).toHaveBeenCalledTimes(1)
    expect(mocks.redirect).toHaveBeenCalledWith('/island-logistics')
  })
})
