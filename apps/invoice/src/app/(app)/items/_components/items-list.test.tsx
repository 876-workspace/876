/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'
import { ItemsList } from './items-list'
import type { ItemRow } from '@876/billing-ui/items-table'

function createItem(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 'itm_2kL9mN4q',
    name: 'Consulting hour',
    type: 'SERVICE',
    sku: 'SVC-001',
    unit: 'hour',
    defaultSellingAmount: '750000',
    defaultSellingCurrency: 'JMD',
    isTaxable: true,
    isActive: true,
    ...overrides,
  }
}

describe('ItemsList', () => {
  beforeEach(resetNavigationTestState)

  it('renders the full table when no item is open', () => {
    render(<ItemsList items={[createItem()]} defaultCurrency="JMD" />)

    expect(screen.queryByRole('link', { name: /^View item/ })).toBeNull()
    expect(screen.getByText('Consulting hour')).toBeTruthy()
  })

  it('renders the condensed pane and marks the open item when one is selected', () => {
    navigationTestState.segments = ['itm_7pQ2rS5t']

    render(
      <ItemsList
        items={[
          createItem(),
          createItem({ id: 'itm_7pQ2rS5t', name: 'Courier delivery' }),
        ]}
        defaultCurrency="JMD"
      />
    )

    const open = screen.getByRole('link', {
      name: 'View item Courier delivery',
    })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/items/itm_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View item Consulting hour' })
        .getAttribute('aria-current')
    ).toBeNull()
  })

  it('narrows the pane to inactive items when the status filter is inactive', () => {
    navigationTestState.segments = ['itm_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=inactive')

    render(
      <ItemsList
        items={[
          createItem(),
          createItem({
            id: 'itm_7pQ2rS5t',
            name: 'Retired service',
            isActive: false,
          }),
        ]}
        defaultCurrency="JMD"
      />
    )

    expect(
      screen.getByRole('link', { name: 'View item Retired service' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'View item Consulting hour' })
    ).toBeNull()
  })

  it('marks an inactive row in the pane rather than showing its price', () => {
    navigationTestState.segments = ['itm_2kL9mN4q']

    render(
      <ItemsList
        items={[createItem({ isActive: false })]}
        defaultCurrency="JMD"
      />
    )

    expect(screen.getByText('Inactive')).toBeTruthy()
  })
})
