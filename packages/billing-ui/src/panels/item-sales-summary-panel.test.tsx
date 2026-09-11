import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  ItemSalesSummaryPanel,
  type ItemSalesSummaryData,
} from './item-sales-summary-panel'

function createData(overrides: Partial<ItemSalesSummaryData> = {}) {
  const data: ItemSalesSummaryData = {
    quantitySold: 25,
    quantityReturned: 3,
    netDisplay: 'J$2,200.00',
    monthlyBuckets: [
      {
        key: 'm1',
        label: 'Aug',
        valueLabel: 'J$1,000.00',
        rawValue: '100000',
      },
      {
        key: 'm2',
        label: 'Sep',
        valueLabel: 'J$1,200.00',
        rawValue: '120000',
      },
    ],
    ...overrides,
  }
  return data
}

describe('ItemSalesSummaryPanel', () => {
  it('renders quantities, net, and monthly bars', () => {
    render(
      <ItemSalesSummaryPanel state={{ status: 'ready', data: createData() }} />
    )
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('J$2,200.00')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Sep: J$1,200.00' })
    ).toBeInTheDocument()
  })

  it('renders distinct empty and error states', () => {
    const { rerender } = render(<ItemSalesSummaryPanel state={{ status: 'empty' }} />)
    expect(screen.getByText('No sales recorded.')).toBeInTheDocument()
    rerender(
      <ItemSalesSummaryPanel
        state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })

  it('renders ready content without bucket bars when empty', () => {
    render(
      <ItemSalesSummaryPanel
        state={{ status: 'ready', data: createData({ monthlyBuckets: [] }) }}
      />
    )
    expect(screen.getByText('J$2,200.00')).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Item net sales per month' })
    ).not.toBeInTheDocument()
  })
})
