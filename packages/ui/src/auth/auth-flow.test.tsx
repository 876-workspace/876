import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AuthFlow } from './auth-flow'
import { AuthProvider } from './context'
import type { SDK876AuthClient } from './types'

describe('AuthFlow social login', () => {
  it('re-enables provider buttons when a mobile browser restores the page', async () => {
    const socialLogin = vi.fn(() => new Promise<never>(() => undefined))
    const client = {
      getProviders: vi.fn(() => new Promise<never>(() => undefined)),
      socialLogin,
    } as unknown as SDK876AuthClient

    render(
      <AuthProvider
        config={{
          mode: 'enterprise',
          client,
          socialProviders: ['google'],
        }}
      >
        <AuthFlow />
      </AuthProvider>
    )

    const googleButton = screen.getByRole('button', {
      name: 'Continue with Google',
    })
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(socialLogin).toHaveBeenCalledWith({ provider: 'google' })
      expect(googleButton).toBeDisabled()
    })

    const restoredPage = new Event('pageshow')
    Object.defineProperty(restoredPage, 'persisted', { value: true })
    window.dispatchEvent(restoredPage)

    await waitFor(() => expect(googleButton).toBeEnabled())
  })
})
