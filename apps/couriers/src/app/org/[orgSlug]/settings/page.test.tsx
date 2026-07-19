/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getManageContext: vi.fn() }))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))

import SettingsPage from './page'

async function renderPage() {
  render(
    await SettingsPage({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })
  )
}

describe('Couriers settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_1',
      orgSlug: 'island-logistics',
      orgName: 'Island Logistics',
      role: 'owner',
    })
  })

  it('shows the title, org-name subtitle, search box, and grouped headings', async () => {
    await renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' })
    ).toBeVisible()
    expect(screen.getByText('Island Logistics')).toBeVisible()
    expect(
      screen.getByRole('searchbox', { name: 'Search settings' })
    ).toBeVisible()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    ).toEqual([
      'Organization',
      'Users & roles',
      'Setup & configuration',
      'Billing',
    ])
  })

  it('links only the built pages, to their correct routes', async () => {
    await renderPage()

    expect(
      screen.getAllByRole('link').map((link) => ({
        title: link.textContent,
        href: link.getAttribute('href'),
      }))
    ).toEqual([
      { title: 'Profile', href: '/org/island-logistics/settings/orgprofile' },
      { title: 'Team', href: '/org/island-logistics/settings/team' },
      { title: 'General', href: '/org/island-logistics/settings/general' },
      {
        title: 'Notifications',
        href: '/org/island-logistics/settings/notifications',
      },
      { title: 'Billing', href: '/org/island-logistics/settings/billing' },
    ])
  })

  it('shows not-yet-built items as non-clickable, not broken links', async () => {
    await renderPage()

    expect(screen.getByText('Branding')).toBeVisible()
    expect(screen.getByText('Roles')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Branding' })
    ).not.toBeInTheDocument()
  })

  it('filters items and groups as the user types in search', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.type(
      screen.getByRole('searchbox', { name: 'Search settings' }),
      'profile'
    )

    // Only the matching item (and its group) remain.
    expect(screen.getByText('Profile')).toBeVisible()
    expect(screen.queryByText('Team')).not.toBeInTheDocument()
    expect(screen.queryByText('Billing')).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    ).toEqual(['Organization'])
  })

  it('shows an empty state when nothing matches the search', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.type(
      screen.getByRole('searchbox', { name: 'Search settings' }),
      'zzzznope'
    )

    expect(screen.getByText(/No settings match/)).toBeVisible()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
