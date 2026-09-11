import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  SubscriptionSummaryPanel,
  type SubscriptionSummaryPanelData,
} from './subscription-summary-panel'

function createData(overrides: Partial<SubscriptionSummaryPanelData> = {}) {
  const data: SubscriptionSummaryPanelData = {
    blocks: [
      {
        currency: 'JMD',
        active: 4,
        trialing: 1,
        paused: 2,
        mrrDisplay: 'J$400.00',
        arrDisplay: 'J$4,800.00',
        churnDisplay: '25%',
        maxBucketCount: 3,
        buckets: [
          {
            start: 1,
            end: 2,
            label: 'Sep',
            newCount: 3,
            canceledCount: 1,
          },
        ],
      },
    ],
    ...overrides,
  }
  return data
}

describe('SubscriptionSummaryPanel', () => {
  it('renders ready counts, MRR, and churn', () => {
    render(
      <SubscriptionSummaryPanel state={{ status: 'ready', data: createData() }} />
    )
    expect(screen.getByText('J$400.00')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('labels paired new versus canceled bars accessibly', () => {
    render(
      <SubscriptionSummaryPanel state={{ status: 'ready', data: createData() }} />
    )
    expect(screen.getByRole('img', { name: 'Sep new: 3' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Sep canceled: 1' })
    ).toBeInTheDocument()
  })

  it('renders one block per currency without summing them', () => {
    const data = createData({
      blocks: [
        { ...createData().blocks[0], currency: 'JMD' },
        { ...createData().blocks[0], currency: 'USD', mrrDisplay: 'US$50.00' },
      ],
    })
    render(<SubscriptionSummaryPanel state={{ status: 'ready', data }} />)
    expect(
      screen.getByLabelText('JMD subscription summary')
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('USD subscription summary')
    ).toBeInTheDocument()
    expect(screen.queryByText('J$450.00')).not.toBeInTheDocument()
  })

  it('renders distinct empty and error states', () => {
    const { rerender } = render(
      <SubscriptionSummaryPanel state={{ status: 'empty' }} />
    )
    expect(screen.getByText('No subscriptions recorded.')).toBeInTheDocument()
    rerender(
      <SubscriptionSummaryPanel
        state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })
})
