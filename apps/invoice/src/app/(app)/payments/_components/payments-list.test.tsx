/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  navigationTestState,
  resetNavigationTestState,
} from '@/test/next-navigation-stub'
import { PaymentsList } from './payments-list'

type PaymentRow = Parameters<typeof PaymentsList>[0]['payments'][number]

function createPayment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay_2kL9mN4q',
    number: 'PMT-1001',
    customer: { name: 'Alejandra Reyes' },
    amount: '150000',
    currency: 'JMD',
    paymentDate: 1767225600,
    status: 'SUCCEEDED',
    depositAccount: 'Operating account',
    ...overrides,
  } as PaymentRow
}

describe('PaymentsList', () => {
  beforeEach(resetNavigationTestState)

  it('renders the full table when no payment is open', () => {
    render(<PaymentsList payments={[createPayment()]} />)

    expect(screen.queryByRole('link', { name: /^View payment/ })).toBeNull()
    expect(screen.getByText('PMT-1001')).toBeTruthy()
  })

  it('marks the open payment in the condensed pane', () => {
    navigationTestState.segments = ['pay_7pQ2rS5t']

    render(
      <PaymentsList
        payments={[
          createPayment(),
          createPayment({ id: 'pay_7pQ2rS5t', number: 'PMT-1002' }),
        ]}
      />
    )

    const open = screen.getByRole('link', { name: 'View payment PMT-1002' })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/payments/pay_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View payment PMT-1001' })
        .getAttribute('aria-current')
    ).toBeNull()
  })

  it('carries the active query string onto every record link', () => {
    navigationTestState.segments = ['pay_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=all')

    render(<PaymentsList payments={[createPayment()]} />)

    expect(
      screen
        .getByRole('link', { name: 'View payment PMT-1001' })
        .getAttribute('href')
    ).toBe('/payments/pay_2kL9mN4q?status=all')
  })

  it('keeps every payment listed — the section exposes only an All filter', () => {
    navigationTestState.segments = ['pay_2kL9mN4q']
    navigationTestState.searchParams = new URLSearchParams('status=refunded')

    render(
      <PaymentsList
        payments={[
          createPayment(),
          createPayment({
            id: 'pay_7pQ2rS5t',
            number: 'PMT-1002',
            status: 'REFUNDED',
          }),
        ]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View payment PMT-1001' })
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'View payment PMT-1002' })
    ).toBeTruthy()
  })

  it('renders the pane empty state when there are no payments', () => {
    navigationTestState.segments = ['pay_2kL9mN4q']

    render(<PaymentsList payments={[]} />)

    expect(screen.getByText('No payments received')).toBeTruthy()
  })
})
