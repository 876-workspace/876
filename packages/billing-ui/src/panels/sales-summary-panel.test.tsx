import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  SalesSummaryPanel,
  type SalesSummaryPanelData,
} from './sales-summary-panel'

function createData(overrides: Partial<SalesSummaryPanelData> = {}) {
  const data: SalesSummaryPanelData = {
    blocks: [
      {
        currency: 'JMD',
        subscriptionDisplay: 'J$100.00',
        recurringDisplay: 'J$20.00',
        oneOffDisplay: 'J$30.00',
        salesReceiptsDisplay: 'J$10.00',
        creditNotesDisplay: 'J$5.00',
        netSalesDisplay: 'J$155.00',
        buckets: [
          {
            key: 'b1',
            start: 1,
            end: 2,
            label: 'Sep 1',
            valueLabel: 'J$100.00',
            rawValue: '10000',
          },
          {
            key: 'b2',
            start: 2,
            end: 3,
            label: 'Sep 2',
            valueLabel: 'J$55.00',
            rawValue: '5500',
          },
        ],
      },
    ],
    ...overrides,
  }
  return data
}

describe('SalesSummaryPanel', () => {
  it('renders ready source splits and bar labels', () => {
    render(<SalesSummaryPanel state={{ status: 'ready', data: createData() }} />)
    expect(screen.getByText('J$155.00')).toBeInTheDocument()
    expect(screen.getByText('Subscription invoices')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Sep 1: J$100.00' })
    ).toBeInTheDocument()
  })

  it('renders one block per currency without summing them', () => {
    const data = createData({
      blocks: [
        { ...createData().blocks[0], currency: 'JMD' },
        { ...createData().blocks[0], currency: 'USD', netSalesDisplay: 'US$10.00' },
      ],
    })
    render(<SalesSummaryPanel state={{ status: 'ready', data }} />)
    expect(screen.getByLabelText('JMD sales')).toBeInTheDocument()
    expect(screen.getByLabelText('USD sales')).toBeInTheDocument()
    expect(screen.getByText('J$155.00')).toBeInTheDocument()
    expect(screen.getByText('US$10.00')).toBeInTheDocument()
    expect(screen.queryByText('J$165.00')).not.toBeInTheDocument()
  })

  it('renders distinct empty and error states', () => {
    const { rerender } = render(<SalesSummaryPanel state={{ status: 'empty' }} />)
    expect(screen.getByText('No sales recorded.')).toBeInTheDocument()
    rerender(
      <SalesSummaryPanel
        state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
    expect(screen.queryByText('No sales recorded.')).not.toBeInTheDocument()
  })

  it('exposes every bucket bar with its formatted value', () => {
    render(<SalesSummaryPanel state={{ status: 'ready', data: createData() }} />)
    const chart = screen.getByRole('img', { name: 'JMD net sales per bucket' })
    expect(
      within(chart).getByRole('img', { name: 'Sep 2: J$55.00' })
    ).toBeInTheDocument()
  })
})
