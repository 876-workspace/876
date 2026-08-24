import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: (session: { user?: unknown } | null) => Boolean(session?.user),
}))
vi.mock('./_components/business-onboarding', () => ({ BusinessOnboarding: () => <div data-testid="business-onboarding">onboarding</div> }))

import RegisterPage from './page'

describe('RegisterPage — simplified: always shows BusinessOnboarding, no auth redirect (diff)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({ user: null })
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
  })

  it('renders BusinessOnboarding', async () => {
    const ui = await RegisterPage()
    render(ui as React.ReactElement)
    expect(screen.getByTestId('business-onboarding')).toBeInTheDocument()
  })

  it('does not redirect unauthenticated users', async () => {
    const result = await RegisterPage()
    expect(result).toBeDefined()
    // @ts-expect-error — check it's not a redirect error
    expect(result?.digest).toBeUndefined()
  })

  it('blocks a consumer session from Enterprise registration', async () => {
    mocks.getAuthSession.mockResolvedValue({
      user: { realm: 'consumer', crossRealm: false },
    })

    await expect(RegisterPage()).rejects.toMatchObject({ path: '/access-denied' })
  })

  it('exports force-dynamic', async () => {
    const mod = await import('./page')
    expect(mod.dynamic).toBe('force-dynamic')
  })
})
