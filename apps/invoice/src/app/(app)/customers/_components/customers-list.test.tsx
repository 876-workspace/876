/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'
import { CustomersList } from './customers-list'
import type { CustomerRow } from '@876/billing-ui/customers-table'

function createCustomer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: 'cus_2kL9mN4q',
    name: 'Alejandra Reyes',
    companyName: 'Reyes Consulting',
    contactName: 'Alejandra Reyes',
    phone: '+18765551000',
    receivables: '150000',
    currency: 'JMD',
    status: 'ACTIVE',
    ...overrides,
  }
}

describe('CustomersList', () => {
  beforeEach(resetNavigationTestState)

  it('renders the full table when no customer is open', () => {
    render(<CustomersList customers={[createCustomer()]} />)

    // A table column that the condensed pane does not carry.
    expect(screen.getByText('+18765551000')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /^View customer/ })).toBeNull()
  })

  it('renders the condensed pane and marks the open customer when one is selected', () => {
    navigationTestState.segments = ['cus_7pQ2rS5t']

    render(
      <CustomersList
        customers={[
          createCustomer(),
          createCustomer({
            id: 'cus_7pQ2rS5t',
            name: 'Devon Blake',
            companyName: null,
            contactName: 'Devon Blake',
          }),
        ]}
      />
    )

    const open = screen.getByRole('link', { name: 'View customer Devon Blake' })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/customers/cus_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View customer Alejandra Reyes' })
        .getAttribute('aria-current')
    ).toBeNull()
    // The table-only column is gone.
    expect(screen.queryByText('+18765551000')).toBeNull()
  })

  it('narrows the pane to the archived customers when the status filter is archived', () => {
    navigationTestState.segments = ['cus_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=archived')

    render(
      <CustomersList
        customers={[
          createCustomer(),
          createCustomer({
            id: 'cus_7pQ2rS5t',
            name: 'Devon Blake',
            status: 'ARCHIVED',
          }),
        ]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View customer Devon Blake' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'View customer Alejandra Reyes' })
    ).toBeNull()
  })

  it('carries the active query string onto every record link', () => {
    navigationTestState.segments = ['cus_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=active')

    render(<CustomersList customers={[createCustomer()]} />)

    expect(
      screen
        .getByRole('link', { name: 'View customer Alejandra Reyes' })
        .getAttribute('href')
    ).toBe('/customers/cus_2kL9mN4q?status=active')
  })

  it('renders the pane empty state when the filter matches no customer', () => {
    navigationTestState.segments = ['cus_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=archived')

    render(<CustomersList customers={[createCustomer()]} />)

    expect(screen.getByText('No customers yet')).toBeTruthy()
  })
})
