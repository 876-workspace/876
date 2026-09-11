import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  ReceivablesAgingPanel,
  type ReceivablesAgingPanelData,
} from './receivables-aging-panel'

function createData(overrides: Partial<ReceivablesAgingPanelData> = {}) {
  const data: ReceivablesAgingPanelData = {
    blocks: [
      {
        currency: 'JMD',
        currentDisplay: 'J$100.00',
        days1To30Display: 'J$30.00',
        days31To60Display: 'J$0.00',
        days61To90Display: 'J$0.00',
        over90Display: 'J$5.00',
        totalOutstandingDisplay: 'J$135.00',
        totalOverdueDisplay: 'J$35.00',
        bucketBars: [
          { key: 'cur', bucket: 'current', label: 'Current', valueLabel: 'J$100.00', rawValue: '10000' },
          { key: 'd30', bucket: 'days1To30', label: '1–30 days', valueLabel: 'J$30.00', rawValue: '3000' },
          { key: 'd60', bucket: 'days31To60', label: '31–60 days', valueLabel: 'J$0.00', rawValue: '0' },
          { key: 'd90', bucket: 'days61To90', label: '61–90 days', valueLabel: 'J$0.00', rawValue: '0' },
          { key: 'o90', bucket: 'over90', label: 'Over 90 days', valueLabel: 'J$5.00', rawValue: '500' },
        ],
        topCustomers: [
          { customerId: 'cus_1', customerName: 'Acme Ltd', outstandingDisplay: 'J$100.00' },
        ],
      },
    ],
    ...overrides,
  }
  return data
}

describe('ReceivablesAgingPanel', () => {
  it('renders ready totals with accessible bucket bars', () => {
    render(
      <ReceivablesAgingPanel
        state={{ status: 'ready', data: createData() }}
        customerHref={(id) => `/customers/${id}`}
      />
    )
    expect(screen.getByText('J$135.00')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: '1–30 days: J$30.00' })
    ).toBeInTheDocument()
  })

  it('links top customers through the href prop', () => {
    render(
      <ReceivablesAgingPanel
        state={{ status: 'ready', data: createData() }}
        customerHref={(id) => `/customers/${id}`}
      />
    )
    expect(screen.getByRole('link', { name: 'Acme Ltd' })).toHaveAttribute(
      'href',
      '/customers/cus_1'
    )
  })

  it('renders one block per currency without summing them', () => {
    const data = createData({
      blocks: [
        { ...createData().blocks[0], currency: 'JMD' },
        {
          ...createData().blocks[0],
          currency: 'USD',
          totalOutstandingDisplay: 'US$9.00',
          topCustomers: [],
        },
      ],
    })
    render(
      <ReceivablesAgingPanel
        state={{ status: 'ready', data }}
        customerHref={(id) => `/customers/${id}`}
      />
    )
    expect(screen.getByLabelText('JMD receivables aging')).toBeInTheDocument()
    expect(screen.getByLabelText('USD receivables aging')).toBeInTheDocument()
    expect(screen.queryByText('J$144.00')).not.toBeInTheDocument()
  })

  it('renders distinct empty and error states', () => {
    const { rerender } = render(
      <ReceivablesAgingPanel
        state={{ status: 'empty' }}
        customerHref={(id) => `/customers/${id}`}
      />
    )
    expect(screen.getByText('No outstanding receivables.')).toBeInTheDocument()
    rerender(
      <ReceivablesAgingPanel
        state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }}
        customerHref={(id) => `/customers/${id}`}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })
})
