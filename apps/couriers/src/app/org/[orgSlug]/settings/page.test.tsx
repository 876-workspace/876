/** @vitest-environment jsdom */

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SettingsPage from './page'

describe('Couriers settings page', () => {
  it('renders every settings destination with organization terminology', async () => {
    render(
      await SettingsPage({
        params: Promise.resolve({ orgSlug: 'island-logistics' }),
      })
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' })
    ).toBeVisible()
    expect(
      screen.getByText('Manage your workspace settings and preferences.')
    ).toBeVisible()

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    expect(
      links.map((link) => ({
        title: within(link).getByText(/^(General|Team|Billing|Notifications)$/)
          .textContent,
        description: within(link).getByText(
          /^(Organization name|Manage staff|Your plan|Alert channels)/
        ).textContent,
        href: link.getAttribute('href'),
      }))
    ).toEqual([
      {
        title: 'General',
        description:
          'Organization name, currency, subdomain, and regional defaults.',
        href: '/org/island-logistics/settings/general',
      },
      {
        title: 'Team',
        description: 'Manage staff accounts and control who has access.',
        href: '/org/island-logistics/settings/team',
      },
      {
        title: 'Billing',
        description: 'Your plan, payment method, and invoice history.',
        href: '/org/island-logistics/settings/billing',
      },
      {
        title: 'Notifications',
        description: 'Alert channels and delivery event subscriptions.',
        href: '/org/island-logistics/settings/notifications',
      },
    ])
    expect(screen.queryByText(/Company name/)).not.toBeInTheDocument()
  })
})
