/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'
import { InvoicesList } from './invoices-list'

type InvoiceRow = Parameters<typeof InvoicesList>[0]['invoices'][number]

function createInvoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: 'inv_2kL9mN4q',
    number: 'INV-1001',
    totalAmount: '150000',
    amountDue: '150000',
    currency: 'JMD',
    status: 'SENT',
    customer: { name: 'Alejandra Reyes' },
    ...overrides,
  } as InvoiceRow
}

describe('InvoicesList', () => {
  beforeEach(resetNavigationTestState)

  it('renders the full table when no invoice is open', () => {
    render(<InvoicesList invoices={[createInvoice()]} />)

    expect(screen.queryByRole('link', { name: /^View invoice/ })).toBeNull()
    expect(screen.getByText('INV-1001')).toBeTruthy()
  })

  it('marks the open invoice in the condensed pane', () => {
    navigationTestState.segments = ['inv_7pQ2rS5t']

    render(
      <InvoicesList
        invoices={[
          createInvoice(),
          createInvoice({ id: 'inv_7pQ2rS5t', number: 'INV-1002' }),
        ]}
      />
    )

    const open = screen.getByRole('link', { name: 'View invoice INV-1002' })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/invoices/inv_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View invoice INV-1001' })
        .getAttribute('aria-current')
    ).toBeNull()
  })

  it('narrows the pane to the paid invoices when the status filter is paid', () => {
    navigationTestState.segments = ['inv_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=paid')

    render(
      <InvoicesList
        invoices={[
          createInvoice(),
          createInvoice({
            id: 'inv_7pQ2rS5t',
            number: 'INV-1002',
            status: 'PAID',
          }),
        ]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View invoice INV-1002' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'View invoice INV-1001' })
    ).toBeNull()
  })

  it('carries the active query string onto every record link', () => {
    navigationTestState.segments = ['inv_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=sent')

    render(<InvoicesList invoices={[createInvoice()]} />)

    expect(
      screen
        .getByRole('link', { name: 'View invoice INV-1001' })
        .getAttribute('href')
    ).toBe('/invoices/inv_2kL9mN4q?status=sent')
  })

  it('renders the pane empty state when the filter matches no invoice', () => {
    navigationTestState.segments = ['inv_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=void')

    render(<InvoicesList invoices={[createInvoice()]} />)

    expect(screen.getByText('No invoices yet')).toBeTruthy()
  })
})
