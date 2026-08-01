/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pathname: '/org/island-logistics/settings/locations',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

import { LocationsNavigation } from './locations-navigation'

function renderNavigation(pathname: string) {
  mocks.pathname = pathname
  render(<LocationsNavigation orgSlug="island-logistics" />)
}

describe('LocationsNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders links for both location kinds', () => {
    renderNavigation('/org/island-logistics/settings/locations')

    expect(screen.getByRole('tab', { name: 'Branches' })).toHaveAttribute(
      'href',
      '/org/island-logistics/settings/locations'
    )
    expect(screen.getByRole('tab', { name: 'Warehouses' })).toHaveAttribute(
      'href',
      '/org/island-logistics/settings/locations/warehouses'
    )
  })

  it('marks branches active on the default route', () => {
    renderNavigation('/org/island-logistics/settings/locations')

    expect(screen.getByRole('tab', { name: 'Branches' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('tab', { name: 'Warehouses' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('marks warehouses active for nested warehouse routes', () => {
    renderNavigation(
      '/org/island-logistics/settings/locations/warehouses/wh_miami/edit'
    )

    expect(screen.getByRole('tab', { name: 'Branches' })).toHaveAttribute(
      'aria-selected',
      'false'
    )
    expect(screen.getByRole('tab', { name: 'Warehouses' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Warehouses' })).toHaveAttribute(
      'href',
      '/org/island-logistics/settings/locations/warehouses'
    )
  })
})
