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
  return {
    ...actual,
    requireSession: mocks.requireSession,
    findAuthRoutingUser: mocks.findAuthRoutingUser,
    resolvePrimaryOrganizationPath: mocks.resolvePrimaryOrganizationPath,
  }
})
vi.mock('./_components/organization-setup', () => ({
  OrganizationSetup: () => <div data-testid="organization-setup">setup</div>,
}))

import OrganizationOnboardingPage from './page'
import { render, screen } from '@testing-library/react'

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
  mocks.requireSession.mockResolvedValue({ id: 'user_1', realm: 'enterprise' })
  mocks.findAuthRoutingUser.mockResolvedValue({ id: 'user_1', email: 'a@b.co' })
  mocks.resolvePrimaryOrganizationPath.mockResolvedValue(null)
})

describe('OrganizationOnboardingPage — session-backed org bootstrap', () => {
  it('requires session with /onboarding returnTo', async () => {
    const ui = await OrganizationOnboardingPage()
    render(ui as React.ReactElement)
    expect(screen.getByTestId('organization-setup')).toBeInTheDocument()
    expect(mocks.requireSession).toHaveBeenCalledWith('/onboarding')
  })

  it('redirects to Enterprise login when user is no longer local', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({
      path: '/login?returnTo=%2Fonboarding',
    })
  })

  it('redirects to org profile when user has primary org', async () => {
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue('/acme/profile')
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({
      path: '/acme/profile',
    })
  })

  it('renders organization setup when no primary org exists', async () => {
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue(null)
    const ui = await OrganizationOnboardingPage()
    render(ui as React.ReactElement)
    expect(screen.getByTestId('organization-setup')).toBeInTheDocument()
  })

  it('renders setup repeatedly until workspace creation completes', async () => {
    const first = await OrganizationOnboardingPage()
    const second = await OrganizationOnboardingPage()
    expect(first).toBeDefined()
    expect(second).toBeDefined()
  })
})
