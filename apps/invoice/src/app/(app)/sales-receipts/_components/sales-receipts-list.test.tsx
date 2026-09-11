/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'
import { SalesReceiptsList } from './sales-receipts-list'

type SalesReceiptRow = Parameters<
  typeof SalesReceiptsList
>[0]['receipts'][number]

function createReceipt(
  overrides: Partial<SalesReceiptRow> = {}
): SalesReceiptRow {
  return {
    id: 'rcp_2kL9mN4q',
    number: 'SR-1001',
    customer: { name: 'Alejandra Reyes' },
    totalAmount: '150000',
    currency: 'JMD',
    status: 'PAID',
    date: 1767225600,
    ...overrides,
  } as SalesReceiptRow
}

describe('SalesReceiptsList', () => {
  beforeEach(resetNavigationTestState)

  it('renders the full table when no receipt is open', () => {
    render(<SalesReceiptsList receipts={[createReceipt()]} />)

    expect(
      screen.queryByRole('link', { name: /^View sales receipt/ })
    ).toBeNull()
    expect(screen.getByText('SR-1001')).toBeTruthy()
  })

  it('marks the open receipt in the condensed pane', () => {
    navigationTestState.segments = ['rcp_7pQ2rS5t']

    render(
      <SalesReceiptsList
        receipts={[
          createReceipt(),
          createReceipt({ id: 'rcp_7pQ2rS5t', number: 'SR-1002' }),
        ]}
      />
    )

    const open = screen.getByRole('link', {
      name: 'View sales receipt SR-1002',
    })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/sales-receipts/rcp_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View sales receipt SR-1001' })
        .getAttribute('aria-current')
    ).toBeNull()
  })

  it('narrows the pane to the void receipts when the status filter is void', () => {
    navigationTestState.segments = ['rcp_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=void')

    render(
      <SalesReceiptsList
        receipts={[
          createReceipt(),
          createReceipt({
            id: 'rcp_7pQ2rS5t',
            number: 'SR-1002',
            status: 'VOID',
          }),
        ]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View sales receipt SR-1002' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'View sales receipt SR-1001' })
    ).toBeNull()
  })

  it('carries the active query string onto every record link', () => {
    navigationTestState.segments = ['rcp_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=paid')

    render(<SalesReceiptsList receipts={[createReceipt()]} />)

    expect(
      screen
        .getByRole('link', { name: 'View sales receipt SR-1001' })
        .getAttribute('href')
    ).toBe('/sales-receipts/rcp_2kL9mN4q?status=paid')
  })

  it('renders the pane empty state when the filter matches no receipt', () => {
    navigationTestState.segments = ['rcp_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=void')

    render(<SalesReceiptsList receipts={[createReceipt()]} />)

    expect(screen.getByText('No sales receipts yet')).toBeTruthy()
  })
})
