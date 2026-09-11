import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  CustomerSalesSummaryPanel,
  type CustomerSalesSummaryData,
} from './customer-sales-summary-panel'

function createData(overrides: Partial<CustomerSalesSummaryData> = {}) {
  const data: CustomerSalesSummaryData = {
    lifetimeSalesDisplay: 'J$1,000.00',
    lifetimeCreditsDisplay: 'J$50.00',
    lastSaleDisplay: '30 Sep 2026',
    rangeSalesDisplay: 'J$200.00',
    activeSubscriptionCount: 2,
    subscriptionMrrDisplay: 'J$80.00',
    monthlyBuckets: [
      {
        key: 'm1',
        label: 'Aug',
        valueLabel: 'J$80.00',
        rawValue: '8000',
      },
      {
        key: 'm2',
        label: 'Sep',
        valueLabel: 'J$120.00',
        rawValue: '12000',
      },
    ],
    ...overrides,
  }
  return data
}

describe('CustomerSalesSummaryPanel', () => {
  it('renders lifetime figures and monthly bars', () => {
    render(
      <CustomerSalesSummaryPanel
        state={{ status: 'ready', data: createData() }}
      />
    )
    expect(screen.getByText('J$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('J$50.00')).toBeInTheDocument()
    expect(screen.getByText('30 Sep 2026')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sep: J$120.00' })).toBeInTheDocument()
  })

  it('shows subscription facts only when provided', () => {
    const { rerender } = render(
      <CustomerSalesSummaryPanel
        state={{ status: 'ready', data: createData() }}
      />
    )
    expect(screen.getByText('Subscription MRR')).toBeInTheDocument()
    rerender(
      <CustomerSalesSummaryPanel
        state={{
          status: 'ready',
          data: createData({
            activeSubscriptionCount: null,
            subscriptionMrrDisplay: null,
          }),
        }}
      />
    )
    expect(screen.queryByText('Subscription MRR')).not.toBeInTheDocument()
    expect(screen.queryByText('Active subscriptions')).not.toBeInTheDocument()
  })

  it('renders distinct empty and error states', () => {
    const { rerender } = render(
      <CustomerSalesSummaryPanel state={{ status: 'empty' }} />
    )
    expect(screen.getByText('No sales recorded.')).toBeInTheDocument()
    rerender(
      <CustomerSalesSummaryPanel
        state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })
})
