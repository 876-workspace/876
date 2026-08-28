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

describe('AuthFlow initial notice', () => {
  function renderWithNotice(initialNotice?: {
    type: 'error' | 'success' | 'info'
    message: string
  }) {
    const client = {
      getProviders: vi.fn(() => new Promise<never>(() => undefined)),
      socialLogin: vi.fn(() => new Promise<never>(() => undefined)),
    } as unknown as SDK876AuthClient

    render(
      <AuthProvider
        config={{
          mode: 'enterprise',
          client,
          socialProviders: ['google'],
          initialNotice,
        }}
      >
        <AuthFlow />
      </AuthProvider>
    )

    return client
  }

  it('shows a failed social callback instead of a blank sign-in form', () => {
    renderWithNotice({
      type: 'error',
      message: 'We could not complete sign-in with that provider.',
    })

    expect(
      screen.getByText('We could not complete sign-in with that provider.')
    ).toBeInTheDocument()
  })

  it('renders no notice when the login page has nothing to report', () => {
    renderWithNotice()

    expect(
      screen.queryByText(/could not complete sign-in/i)
    ).not.toBeInTheDocument()
  })

  it('clears the notice once the user retries a provider', async () => {
    renderWithNotice({ type: 'error', message: 'Sign-in was cancelled.' })

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' })
    )

    await waitFor(() =>
      expect(
        screen.queryByText('Sign-in was cancelled.')
      ).not.toBeInTheDocument()
    )
  })
})
