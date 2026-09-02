/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'
import { QuotesList } from './quotes-list'

type QuoteRow = Parameters<typeof QuotesList>[0]['quotes'][number]

function createQuote(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: 'quo_2kL9mN4q',
    number: 'QT-1001',
    totalAmount: '150000',
    currency: 'JMD',
    status: 'DRAFT',
    customer: { name: 'Alejandra Reyes' },
    convertedInvoice: null,
    ...overrides,
  } as QuoteRow
}

describe('QuotesList', () => {
  beforeEach(resetNavigationTestState)

  it('renders the full table when no quote is open', () => {
    render(<QuotesList quotes={[createQuote()]} />)

    expect(screen.queryByRole('link', { name: /^View quote/ })).toBeNull()
    expect(screen.getByText('QT-1001')).toBeTruthy()
  })

  it('marks the open quote in the condensed pane', () => {
    navigationTestState.segments = ['quo_7pQ2rS5t']

    render(
      <QuotesList
        quotes={[
          createQuote(),
          createQuote({ id: 'quo_7pQ2rS5t', number: 'QT-1002' }),
        ]}
      />
    )

    const open = screen.getByRole('link', { name: 'View quote QT-1002' })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/quotes/quo_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View quote QT-1001' })
        .getAttribute('aria-current')
    ).toBeNull()
  })

  it('narrows the pane to the accepted quotes when the status filter is accepted', () => {
    navigationTestState.segments = ['quo_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=accepted')

    render(
      <QuotesList
        quotes={[
          createQuote(),
          createQuote({
            id: 'quo_7pQ2rS5t',
            number: 'QT-1002',
            status: 'ACCEPTED',
          }),
        ]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View quote QT-1002' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'View quote QT-1001' })
    ).toBeNull()
  })

  it('carries the active query string onto every record link', () => {
    navigationTestState.segments = ['quo_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=draft')

    render(<QuotesList quotes={[createQuote()]} />)

    expect(
      screen
        .getByRole('link', { name: 'View quote QT-1001' })
        .getAttribute('href')
    ).toBe('/quotes/quo_2kL9mN4q?status=draft')
  })

  it('renders the pane empty state when the filter matches no quote', () => {
    navigationTestState.segments = ['quo_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=expired')

    render(<QuotesList quotes={[createQuote()]} />)

    expect(screen.getByText('No quotes yet')).toBeTruthy()
  })
})
