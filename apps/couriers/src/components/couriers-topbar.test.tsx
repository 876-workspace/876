/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OrgSwitcherOrg } from '@876/ui/org-switcher'
import type { SidebarUserMenuUser } from '@876/ui/sidebar-user-menu'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  request: vi.fn(),
  topbarSearch: vi.fn(),
  compactUserMenu: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('@876/ui/topbar-search', () => ({
  TopbarSearch: (props: {
    items: Array<{ group: string; title: string; href: string }>
    onNavigate: (href: string) => void
  }) => {
    mocks.topbarSearch(props)
    const teamSettings = props.items.find(
      (item) => item.href === '/org/island-logistics/settings/team'
    )
    return (
      <button
        type="button"
        onClick={() => props.onNavigate(teamSettings?.href ?? '/missing')}
      >
        Navigate to team settings
      </button>
    )
  },
}))
vi.mock('@876/ui/sidebar-user-menu', () => ({
  CompactUserMenu: (props: {
    user: { name: string; email: string; avatar?: string | null }
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

import {
  CouriersOrgSwitcher,
  CouriersTopbarSearch,
  CouriersUserMenu,
} from './couriers-topbar'

function createOrganization(
  overrides: Partial<OrgSwitcherOrg> = {}
): OrgSwitcherOrg {
  return {
    id: 'organization_island_123',
    name: 'Island Logistics',
    slug: 'island-logistics',
    role: 'owner',
    ...overrides,
  }
}

function createUser(
  overrides: Partial<SidebarUserMenuUser> = {}
): SidebarUserMenuUser {
  return {
    name: 'Althea Morgan',
    email: 'althea@islandlogistics.test',
    avatar: 'https://images.876.test/althea.png',
    ...overrides,
  }
}

describe('Couriers topbar wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: {}, error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pushes the selected organization route exactly once', async () => {
    const user = userEvent.setup()
    const current = createOrganization()
    const other = createOrganization({
      id: 'organization_montego_123',
      name: 'Montego Express',
      slug: 'montego-express',
      role: 'admin',
    })
    render(<CouriersOrgSwitcher current={current} orgs={[current, other]} />)

    await user.click(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Island Logistics',
      })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: /Montego Express/ })
    )

    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/org/montego-express')
  })

  it('does not push when the current organization is selected', async () => {
    const user = userEvent.setup()
    const current = createOrganization()
    const other = createOrganization({
      id: 'organization_montego_123',
      name: 'Montego Express',
      slug: 'montego-express',
      role: 'admin',
    })
    render(<CouriersOrgSwitcher current={current} orgs={[current, other]} />)

    await user.click(
      screen.getByRole('button', {
        name: 'Switch organization. Current organization: Island Logistics',
      })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: /Island Logistics/ })
    )

    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('builds the exact prefixed search directory for navigation, package children, and settings', () => {
    render(<CouriersTopbarSearch basePath="/org/island-logistics" />)

    expect(mocks.topbarSearch).toHaveBeenCalledTimes(1)
    expect(mocks.topbarSearch.mock.calls[0]?.[0].items).toEqual([
      {
        group: 'Navigation',
        title: 'Dashboard',
        href: '/org/island-logistics',
      },
      {
        group: 'Navigation',
        title: 'Customers',
        href: '/org/island-logistics/customers',
      },
      {
        group: 'Navigation',
        title: 'Items',
        href: '/org/island-logistics/items',
      },
      {
        group: 'Navigation',
        title: 'Packages',
        href: '/org/island-logistics/packages',
      },
      {
        group: 'Packages',
        title: 'Pre-alerts',
        href: '/org/island-logistics/packages/pre-alerts',
      },
      {
        group: 'Packages',
        title: 'Deliveries',
        href: '/org/island-logistics/packages/deliveries',
      },
      {
        group: 'Packages',
        title: 'Warehouse',
        href: '/org/island-logistics/packages/warehouse',
      },
      {
        group: 'Packages',
        title: 'Manifest',
        href: '/org/island-logistics/packages/manifest',
      },
      {
        group: 'Settings',
        title: 'Settings',
        href: '/org/island-logistics/settings',
      },
      {
        group: 'Settings',
        title: 'General',
        href: '/org/island-logistics/settings/general',
      },
      {
        group: 'Settings',
        title: 'Billing',
        href: '/org/island-logistics/settings/billing',
      },
      {
        group: 'Settings',
        title: 'Notifications',
        href: '/org/island-logistics/settings/notifications',
      },
      {
        group: 'Settings',
        title: 'Team',
        href: '/org/island-logistics/settings/team',
      },
    ])
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('pushes the exact href selected by topbar search', async () => {
    const user = userEvent.setup()
    render(<CouriersTopbarSearch basePath="/org/island-logistics" />)

    await user.click(
      screen.getByRole('button', { name: 'Navigate to team settings' })
    )

    expect(mocks.topbarSearch).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith(
      '/org/island-logistics/settings/team'
    )
  })

  it('posts logout exactly once and navigates to login after sign-out', async () => {
    const userEventDriver = userEvent.setup()
    const menuUser = createUser()
    vi.stubGlobal('location', {
      href: 'https://couriers.876.test/org/island-logistics',
    })
    render(<CouriersUserMenu user={menuUser} showThemeSwitcher={true} />)

    await userEventDriver.click(
      screen.getByRole('button', { name: 'Sign out' })
    )

    await waitFor(() => expect(window.location.href).toBe('/login'))
    expect(mocks.compactUserMenu).toHaveBeenCalledTimes(1)
    expect(mocks.compactUserMenu.mock.calls[0]?.[0]).toEqual({
      user: menuUser,
      onSignOut: expect.any(Function),
      showThemeSwitcher: true,
      showSystemTheme: false,
    })
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/manage-auth/auth/logout', {
      method: 'POST',
    })
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
