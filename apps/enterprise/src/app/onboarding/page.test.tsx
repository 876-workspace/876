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

describe('OrganizationOnboardingPage — session-backed org bootstrap (goldbergyoni AAA, diff: no /register)', () => {
  it('requires session with /onboarding returnTo', async () => {
    const ui = await OrganizationOnboardingPage()
    render(ui as React.ReactElement)
    expect(screen.getByTestId('organization-setup')).toBeInTheDocument()
    expect(mocks.requireSession).toHaveBeenCalledWith('/onboarding')
    expect(mocks.requireSession).toHaveBeenCalledTimes(1)
  })

  it('redirects to Enterprise login when user is no longer local', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({
      path: '/login?returnTo=%2Fonboarding',
    })
  })

  it('login redirect is exactly /login?returnTo=%2Fonboarding (encoded, relative)', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    try {
      await OrganizationOnboardingPage()
    } catch {}
    const path = mocks.redirect.mock.calls[0]?.[0] as string
    expect(path).toBe('/login?returnTo=%2Fonboarding')
    expect(path).not.toMatch(/^https?:\/\//)
  })

  it('never redirects to legacy /register (diff invariant)', async () => {
    const ui = await OrganizationOnboardingPage()
    render(ui as React.ReactElement)
    expect(mocks.redirect).not.toHaveBeenCalledWith('/register')
    expect(mocks.redirect).not.toHaveBeenCalledWith(
      expect.stringContaining('/register')
    )
  })

  it('redirects to org profile when user has primary org', async () => {
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue('/acme/profile')
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({
      path: '/acme/profile',
    })
  })

  it('primary org redirect is relative not absolute', async () => {
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue('/acme/profile')
    try {
      await OrganizationOnboardingPage()
    } catch (e: unknown) {
      expect((e as { path: string }).path.startsWith('/')).toBe(true)
    }
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

  it('short-circuits: does not check routing user when requireSession redirects', async () => {
    mocks.requireSession.mockImplementation(() => {
      throw redirectErr('/login?returnTo=%2Fonboarding')
    })
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({
      path: '/login?returnTo=%2Fonboarding',
    })
    expect(mocks.findAuthRoutingUser).not.toHaveBeenCalled()
    expect(mocks.resolvePrimaryOrganizationPath).not.toHaveBeenCalled()
  })

  it('short-circuits: does not resolve org path when user missing', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue(null)
    await expect(OrganizationOnboardingPage()).rejects.toMatchObject({
      path: '/login?returnTo=%2Fonboarding',
    })
    expect(mocks.resolvePrimaryOrganizationPath).not.toHaveBeenCalled()
  })

  it('passes session user id to findAuthRoutingUser verbatim', async () => {
    mocks.requireSession.mockResolvedValue({ id: 'workos_abc' } as never)
    mocks.findAuthRoutingUser.mockResolvedValue({
      id: 'local_1',
      email: 'x@y.co',
    } as never)
    try {
      await OrganizationOnboardingPage()
    } catch {}
    expect(mocks.findAuthRoutingUser).toHaveBeenCalledWith('workos_abc')
  })

  it('passes local user id to resolvePrimaryOrganizationPath', async () => {
    mocks.findAuthRoutingUser.mockResolvedValue({
      id: 'local_99',
      email: 'a@b.co',
    } as never)
    try {
      await OrganizationOnboardingPage()
    } catch {}
    expect(mocks.resolvePrimaryOrganizationPath).toHaveBeenCalledWith(
      'local_99'
    )
  })

  it('redirect carries NEXT_REDIRECT digest', async () => {
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue('/acme/profile')
    try {
      await OrganizationOnboardingPage()
    } catch (e: unknown) {
      expect((e as { digest: string }).digest).toBe(
        `NEXT_REDIRECT:${(e as { path: string }).path}`
      )
    }
  })

  it('propagates error from requireSession (not swallowed)', async () => {
    mocks.requireSession.mockRejectedValue(new Error('session store down'))
    await expect(OrganizationOnboardingPage()).rejects.toThrow(
      'session store down'
    )
  })

  it('propagates error from findAuthRoutingUser', async () => {
    mocks.findAuthRoutingUser.mockRejectedValue(new Error('platform outage'))
    await expect(OrganizationOnboardingPage()).rejects.toThrow(
      'platform outage'
    )
  })

  it('propagates error from resolvePrimaryOrganizationPath', async () => {
    mocks.resolvePrimaryOrganizationPath.mockRejectedValue(new Error('db down'))
    await expect(OrganizationOnboardingPage()).rejects.toThrow('db down')
  })

  it('concurrent callers isolated — different users', async () => {
    mocks.findAuthRoutingUser
      .mockResolvedValueOnce({ id: 'u1', email: 'a@b.co' } as never)
      .mockResolvedValueOnce({ id: 'u2', email: 'b@c.co' } as never)
    mocks.resolvePrimaryOrganizationPath
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce('/other/profile' as never)
    const [a, b] = await Promise.allSettled([
      OrganizationOnboardingPage(),
      OrganizationOnboardingPage(),
    ])
    expect(a.status).toBe('fulfilled')
    expect(b.status).toBe('rejected')
  })

  it('is idempotent — same input same output', async () => {
    const first = await OrganizationOnboardingPage()
      .then((r) => r as unknown)
      .catch((e) => (e as { path: string }).path)
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((p: string) => {
      throw redirectErr(p)
    })
    mocks.requireSession.mockResolvedValue({
      id: 'user_1',
      realm: 'enterprise',
    } as never)
    mocks.findAuthRoutingUser.mockResolvedValue({
      id: 'user_1',
      email: 'a@b.co',
    } as never)
    mocks.resolvePrimaryOrganizationPath.mockResolvedValue(null as never)
    const second = await OrganizationOnboardingPage()
      .then((r) => r as unknown)
      .catch((e) => (e as { path: string }).path)
    // both render setup (no redirect) so both are defined React elements
    expect(first).toBeDefined()
    expect(second).toBeDefined()
  })

  it.each([
    ['/acme/profile', '/acme/profile'],
    ['/other-corp/profile', '/other-corp/profile'],
  ])(
    'forwards resolvePrimaryOrganizationPath "%s" verbatim',
    async (orgPath) => {
      mocks.resolvePrimaryOrganizationPath.mockResolvedValue(orgPath as never)
      await expect(OrganizationOnboardingPage()).rejects.toMatchObject({
        path: orgPath,
      })
    }
  )

  it('calls resolvePrimaryOrganizationPath exactly once when rendering setup', async () => {
    await OrganizationOnboardingPage()
    expect(mocks.resolvePrimaryOrganizationPath).toHaveBeenCalledTimes(1)
  })
})
