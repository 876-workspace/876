import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./_components/business-onboarding', () => ({ BusinessOnboarding: () => <div data-testid="business-onboarding">onboarding</div> }))

import RegisterPage from './page'

describe('RegisterPage — simplified: always shows BusinessOnboarding, no auth redirect (diff)', () => {
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

  it('exports force-dynamic', async () => {
    const mod = await import('./page')
    expect(mod.dynamic).toBe('force-dynamic')
  })
})
