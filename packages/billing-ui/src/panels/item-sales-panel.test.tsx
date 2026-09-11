import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { ItemSalesPanel, type ItemSalesPanelData } from './item-sales-panel'

function createData(overrides: Partial<ItemSalesPanelData> = {}) {
  const data: ItemSalesPanelData = {
    rows: [
      {
        itemId: 'itm_1',
        variantId: null,
        itemName: 'Consulting hour',
        currency: 'JMD',
        quantitySold: 10,
        quantityReturned: 2,
        netDisplay: 'J$800.00',
        documentCount: 4,
      },
    ],
    ...overrides,
  }
  return data
}

describe('ItemSalesPanel', () => {
  it('renders ready rows with quantities and net', () => {
    render(
      <ItemSalesPanel
        state={{ status: 'ready', data: createData() }}
        itemHref={(id) => `/items/${id}`}
      />
    )
    expect(screen.getByText('J$800.00')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('links items through the href prop', () => {
    render(
      <ItemSalesPanel
        state={{ status: 'ready', data: createData() }}
        itemHref={(id) => `/items/${id}`}
      />
    )
    expect(
      screen.getByRole('link', { name: 'Consulting hour' })
    ).toHaveAttribute('href', '/items/itm_1')
  })

  it('keeps per-currency rows separate', () => {
    const data = createData({
      rows: [
        { ...createData().rows[0], currency: 'JMD' },
        {
          ...createData().rows[0],
          itemId: 'itm_2',
          itemName: 'Widget',
          currency: 'USD',
          netDisplay: 'US$5.00',
        },
      ],
    })
    render(
      <ItemSalesPanel
        state={{ status: 'ready', data }}
        itemHref={(id) => `/items/${id}`}
      />
    )
    expect(screen.getByText('US$5.00')).toBeInTheDocument()
    expect(screen.getByText('JMD')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
  })

  it('renders distinct empty and error states', () => {
    const { rerender } = render(
      <ItemSalesPanel
        state={{ status: 'empty' }}
        itemHref={(id) => `/items/${id}`}
      />
    )
    expect(screen.getByText('No item sales.')).toBeInTheDocument()
    rerender(
      <ItemSalesPanel
        state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }}
        itemHref={(id) => `/items/${id}`}
      />
    )
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })
})
