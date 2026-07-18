/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  compactUserMenu: vi.fn(),
  request: vi.fn(),
}))

vi.mock('@876/ui/sidebar-user-menu', () => ({
  CompactUserMenu: (props: {
    user: SidebarUserMenuUser
    onSignOut: () => Promise<void>
    showThemeSwitcher: boolean
    showSystemTheme: boolean
  }) => {
    mocks.compactUserMenu(props)
    return (
      <button type="button" onClick={() => void props.onSignOut()}>
        Sign out
      </button>
    )
  },
}))
vi.mock('@/lib/client/request', () => ({ request: mocks.request }))

import { BillingUserMenu } from './billing-user-menu'

function createUser(
  overrides: Partial<SidebarUserMenuUser> = {}
): SidebarUserMenuUser {
  return {
    name: 'Althea Morgan',
    email: 'althea@islandcommerce.test',
    avatar: 'https://images.876.test/althea.png',
    ...overrides,
  }
}

describe('Billing user menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: { ok: true }, error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts logout exactly once and navigates to login after sign-out', async () => {
    const user = userEvent.setup()
    const assign = vi.fn()
    const menuUser = createUser()
    vi.stubGlobal('location', { ...window.location, assign })
    render(<BillingUserMenu user={menuUser} showThemeSwitcher={true} />)

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
    expect(mocks.compactUserMenu).toHaveBeenCalledTimes(1)
    expect(mocks.compactUserMenu.mock.calls[0]?.[0]).toEqual({
      user: menuUser,
      onSignOut: expect.any(Function),
      showThemeSwitcher: true,
      showSystemTheme: false,
    })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
    })
    expect(assign).toHaveBeenCalledWith('/login')
  })
})
