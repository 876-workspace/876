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
      'Users & roles',
      'Core & setup',
      'Operations & fulfillment',
      'Customer portal',
      'Rates & taxes',
      'Customization',
      'Communication',
      'Automation & developer',
      'Billing',
    ])
  })

  it('drops the removed user preferences item', async () => {
    await renderPage()

    expect(screen.queryByText('User preferences')).not.toBeInTheDocument()
  })

  it('uses shared 876 cards with pastel headers and aligns item text with their labels', async () => {
    await renderPage()

    const headings = screen.getAllByRole('heading', { level: 2 })
    const cards = headings.map((heading) => heading.closest('section'))
    const headerBackgrounds = headings.flatMap((heading) =>
      Array.from(heading.classList).filter((className) =>
        /^bg-(violet|fuchsia|rose|amber|lime|emerald|teal|cyan|indigo|orange)-50!$/.test(
          className
        )
      )
    )
    const darkHeaderBackgrounds = headings.flatMap((heading) =>
      Array.from(heading.classList).filter((className) =>
        /^dark:bg-(violet|fuchsia|rose|amber|lime|emerald|teal|cyan|indigo|orange)-400\/6!$/.test(
          className
        )
      )
    )

    expect(headings).toHaveLength(10)
    expect(
      cards.every(
        (card) =>
          card?.classList.contains('876-card') &&
          card.classList.contains('overflow-hidden') &&
          !card.classList.contains('bg-white!') &&
          !card.classList.contains('dark:bg-slate-900!')
      )
    ).toBe(true)
    expect(
      headings.every(
        (heading) =>
          heading.classList.contains('flex') &&
          heading.classList.contains('flex-row') &&
          heading.classList.contains('items-center') &&
          heading.classList.contains('gap-2') &&
          heading.classList.contains('min-h-12') &&
          heading.classList.contains('w-full') &&
          heading.classList.contains('border-b') &&
          heading.classList.contains('px-4') &&
          heading.classList.contains('py-3') &&
          heading.classList.contains('font-semibold') &&
          heading.classList.contains('text-slate-900')
      )
    ).toBe(true)
    expect(headerBackgrounds).toHaveLength(cards.length)
    expect(darkHeaderBackgrounds).toHaveLength(cards.length)
    expect(new Set(headerBackgrounds).size).toBeGreaterThan(1)
    expect(new Set(darkHeaderBackgrounds).size).toBeGreaterThan(1)

    const firstCardBody = screen.getByRole('heading', {
      level: 2,
      name: 'Organization',
    }).nextElementSibling

    expect(firstCardBody).toHaveClass('space-y-0.5')
    expect(firstCardBody).not.toHaveClass('bg-white!')
    expect(firstCardBody).not.toHaveClass('dark:bg-slate-900!')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveClass(
      'py-1.5',
      'pl-6'
    )
  })

  it('renders a module preferences link for every catalog module', async () => {
    await renderPage()

    const expected = COURIERS_MODULE_CATALOG.filter(
      (module) => module.key !== 'general'
    ).map((module) => ({
      title: `${module.label} settings`,
      href: `/island-logistics/settings/modules/${module.key}`,
    }))

    const rendered = expected.map((item) => ({
      title: item.title,
      href: screen.getByRole('link', { name: item.title }).getAttribute('href'),
    }))

    expect(rendered).toEqual(expected)
  })

  it('links locations and warehouses to their own settings areas', async () => {
    await renderPage()

    expect(
      screen.getByRole('link', { name: 'Locations' }).getAttribute('href')
    ).toBe('/island-logistics/settings/locations')
    expect(
      screen.getByRole('link', { name: 'Warehouses' }).getAttribute('href')
    ).toBe('/island-logistics/settings/warehouses')
  })

  it('gives every rendered item a real destination, never a dead link', async () => {
    await renderPage()

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))

    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.every((href) => href?.startsWith('/island-logistics/'))).toBe(
      true
    )
  })
})
