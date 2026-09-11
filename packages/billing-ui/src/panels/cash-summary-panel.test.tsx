import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CashSummaryPanel, type CashSummaryPanelData } from './cash-summary-panel'

function createData(overrides: Partial<CashSummaryPanelData> = {}) {
  const data: CashSummaryPanelData = {
    blocks: [
      {
        currency: 'JMD',
        paymentsDisplay: 'J$200.00',
        salesReceiptsDisplay: 'J$50.00',
        refundsDisplay: 'J$10.00',
        netCashDisplay: 'J$240.00',
        buckets: [
          {
            key: 'b1',
            start: 1,
            end: 2,
            label: 'Sep 1',
            valueLabel: 'J$240.00',
            rawValue: '24000',
          },
        ],
      },
    ],
    ...overrides,
  }
  return data
}

describe('CashSummaryPanel', () => {
  it('renders ready cash splits and bar labels', () => {
    render(<CashSummaryPanel state={{ status: 'ready', data: createData() }} />)
    expect(screen.getByText('J$240.00')).toBeInTheDocument()
    expect(screen.getByText('Sales-receipt cash')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Sep 1: J$240.00' })
    ).toBeInTheDocument()
  })

  it('renders one block per currency without summing them', () => {
    const data = createData({
      blocks: [
        { ...createData().blocks[0], currency: 'JMD' },
        { ...createData().blocks[0], currency: 'USD', netCashDisplay: 'US$7.00' },
      ],
    })
    render(<CashSummaryPanel state={{ status: 'ready', data }} />)
    expect(screen.getByLabelText('JMD cash')).toBeInTheDocument()
    expect(screen.getByLabelText('USD cash')).toBeInTheDocument()
    expect(screen.queryByText('J$247.00')).not.toBeInTheDocument()
  })

  it('renders distinct empty and error states', () => {
    const { rerender } = render(<CashSummaryPanel state={{ status: 'empty' }} />)
    expect(screen.getByText('No cash recorded.')).toBeInTheDocument()
    rerender(
      <CashSummaryPanel
        state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
    expect(screen.queryByText('No cash recorded.')).not.toBeInTheDocument()
  })
})
