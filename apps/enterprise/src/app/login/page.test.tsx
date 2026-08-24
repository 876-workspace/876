import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAccountUsable: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/account-validity', () => ({
  isAccountUsable: mocks.isAccountUsable,
}))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: { user?: unknown } | null) =>
    Boolean(session?.user),
}))
vi.mock('./_components/embedded-auth', () => ({
  EmbeddedAuth: ({ returnTo }: { returnTo: string }) => (
    <div data-testid="embedded-auth">{returnTo}</div>
  ),
}))

import OrgLoginPage from './page'

function redirectError(path: string) {
  return Object.assign(new Error(`redirect:${path}`), { path })
}

function signedSession(realm: 'consumer' | 'enterprise') {
  return { user: { id: 'user_1', realm, crossRealm: false } }
}

describe('OrgLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAccountUsable.mockResolvedValue(true)
    mocks.redirect.mockImplementation((path: string) => {
      throw redirectError(path)
    })
  })

  it('blocks a usable consumer session from Enterprise', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('consumer'))

    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '/acme' }) })
    ).rejects.toMatchObject({ path: '/access-denied' })
  })

  it('redirects a usable Enterprise session to its requested destination', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))

    await expect(
      OrgLoginPage({ searchParams: Promise.resolve({ returnTo: '/acme' }) })
    ).rejects.toMatchObject({ path: '/acme' })
  })

  it('keeps a stale session on the login form so it can be replaced', async () => {
    mocks.getAuthSession.mockResolvedValue(signedSession('enterprise'))
    mocks.isAccountUsable.mockResolvedValue(false)

    render(await OrgLoginPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByTestId('embedded-auth')).toBeVisible()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
