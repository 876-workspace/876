/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { ItemsTable } from './items-table'

const items = [
  {
    id: 'item_1',
    name: 'Priority delivery',
    type: 'SERVICE',
    sku: 'PRIO-1',
    unit: 'hour',
    defaultSellingAmount: 1999n,
    defaultSellingCurrency: 'JMD',
    isTaxable: true,
    isActive: true,
    prices: [{ id: 'p1' }, { id: 'p2' }],
  },
  {
    id: 'item_2',
    name: 'Generic widget',
    type: 'GOOD',
    sku: null,
    unit: null,
    defaultSellingAmount: null,
    defaultSellingCurrency: null,
    isTaxable: false,
    isActive: false,
    prices: [],
  },
]

describe('ItemsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders item names with links and sku', () => {
    render(<ItemsTable items={items} defaultCurrency="JMD" />)
    expect(
      screen.getByRole('link', { name: 'Priority delivery' })
    ).toHaveAttribute('href', '/items/item_1')
    expect(screen.getByText(/service · PRIO-1/i)).toBeTruthy()
    expect(screen.getByText(/good · No SKU/i)).toBeTruthy()
  })

  it('formats default price and handles custom pricing', () => {
    render(<ItemsTable items={items} defaultCurrency="JMD" />)
    expect(screen.getByText('$19.99')).toBeTruthy()
    expect(screen.getByText('Custom pricing')).toBeTruthy()
  })

  it('renders tax and status badges', () => {
    render(<ItemsTable items={items} defaultCurrency="JMD" />)
    expect(screen.getByText('Taxable')).toBeTruthy()
    expect(screen.getByText('Non-taxable')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Archived')).toBeTruthy()
  })

  it('renders prices count', () => {
    render(<ItemsTable items={items} defaultCurrency="USD" />)
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('renders empty state', () => {
    render(
      <ItemsTable
        items={[]}
        defaultCurrency="JMD"
        emptyState={<div>empty-items</div>}
      />
    )
    expect(screen.getByText('empty-items')).toBeTruthy()
  })

  it('navigates on row click', async () => {
    const user = userEvent.setup()
    render(<ItemsTable items={items} defaultCurrency="JMD" />)
    const row = screen.getByText('Priority delivery').closest('tr')
    if (row) await user.click(row)
    expect(pushMock).toHaveBeenCalledWith('/items/item_1')
  })

  it('renders headers including Actions srOnly', () => {
    const { container } = render(
      <ItemsTable items={items} defaultCurrency="JMD" />
    )
    expect(container.textContent).toContain('Item')
    expect(container.textContent).toContain('Default price')
    expect(container.textContent).toContain('Tax')
    expect(container.textContent).toContain('Prices')
    expect(container.textContent).toContain('Status')
  })
})
