/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { COURIERS_MODULE_CATALOG } from '@/lib/modules'

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
      'Organization',
      'Users & roles',
      'Customer portal',
      'Rates & taxes',
      'Customization',
      'Communication',
      'Automation & developer',
      'Billing',
      'Modules',
      'Operations',
      'Commerce',
      'Preferences',
    ])
  })

  it('splits the groups into sections so no card dwarfs its row', async () => {
    await renderPage()

    // Every module card carries a comparable number of items; the eleven-module
    // list is deliberately not one oversized card beside two-item cards.
    const sectionHeadings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)

    expect(sectionHeadings).toContain('Modules')
    expect(sectionHeadings.filter((t) => t === 'Organization')).toHaveLength(2)
  })

  it('drops the removed user preferences item', async () => {
    await renderPage()

    expect(screen.queryByText('User preferences')).not.toBeInTheDocument()
  })

  it('renders a module preferences link for every catalog module', async () => {
    await renderPage()

    const expected = COURIERS_MODULE_CATALOG.filter(
      (module) => module.key !== 'general'
    ).map((module) => ({
      title: module.label,
      href: `/org/island-logistics/settings/modules/${module.key}`,
    }))

    const rendered = expected.map((item) => ({
      title: item.title,
      href: screen.getByRole('link', { name: item.title }).getAttribute('href'),
    }))

    expect(rendered).toEqual(expected)
  })

  it('links locations and branches, the page settings readiness points at', async () => {
    await renderPage()

    expect(
      screen
        .getByRole('link', { name: 'Locations & branches' })
        .getAttribute('href')
    ).toBe('/org/island-logistics/settings/branches')
  })

  it('gives every rendered item a real destination, never a dead link', async () => {
    await renderPage()

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))

    expect(hrefs.length).toBeGreaterThan(0)
    expect(
      hrefs.every((href) => href?.startsWith('/org/island-logistics/'))
    ).toBe(true)
  })
})
