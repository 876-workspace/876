/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConsoleShellUser } from './console-shell'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}))

vi.mock('@/lib/client/request', () => ({ request: mocks.request }))

import { ConsoleUserMenu } from './console-user-menu'

function createUser(
  overrides: Partial<ConsoleShellUser> = {}
): ConsoleShellUser {
  return {
    name: 'Althea Morgan',
    email: 'althea@islandcommerce.test',
    avatar: null,
    countryCode: 'JM',
    ...overrides,
  }
}

describe('Console user menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { ok: true }, error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the account trigger with the user initials and theme option by default', async () => {
    const user = userEvent.setup()
    render(<ConsoleUserMenu user={createUser()} />)

    const trigger = screen.getByRole('button', { name: 'Open account menu' })
    expect(within(trigger).getByText('AM')).toBeVisible()
    await user.click(trigger)

    expect(
      await screen.findByRole('button', { name: 'Appearance' })
    ).toBeVisible()
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('hides the theme option when showThemeSwitcher is false', async () => {
    const user = userEvent.setup()
    render(<ConsoleUserMenu user={createUser()} showThemeSwitcher={false} />)

    await user.click(screen.getByRole('button', { name: 'Open account menu' }))

    expect(
      screen.queryByRole('button', { name: 'Appearance' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible()
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('posts logout exactly once and navigates to login after sign-out', async () => {
    const user = userEvent.setup()
    const location = { ...window.location, href: 'http://localhost/' }
    vi.stubGlobal('location', location)
    render(<ConsoleUserMenu user={createUser()} showThemeSwitcher={false} />)
    await user.click(screen.getByRole('button', { name: 'Open account menu' }))

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(location.href).toBe('/login'))
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
    })
  })
})
