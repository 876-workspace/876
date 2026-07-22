/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SettingsPage from './page'

async function renderPage() {
  render(
    await SettingsPage({
      params: Promise.resolve({ orgSlug: 'island-logistics' }),
    })
  )
}

describe('Couriers settings page', () => {
  it('shows the title and grouped headings, without a subtitle or search box', async () => {
    await renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' })
    ).toBeVisible()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()

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
      { title: 'Users', href: '/org/island-logistics/settings/users' },
      { title: 'Roles', href: '/org/island-logistics/settings/users/roles' },
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
    expect(screen.getByText('User preferences')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Branding' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'User preferences' })
    ).not.toBeInTheDocument()
  })
})
