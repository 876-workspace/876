/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { ItemsTable, type ItemRow } from './items-table'

function formatAmount(
  amount: bigint | string | null,
  currency: string
): string {
  if (amount === null) return 'Custom pricing'
  return `${currency} ${(Number(amount) / 100).toFixed(2)}`
}

function items(overrides: Partial<ItemRow>[] = []): ItemRow[] {
  const base: ItemRow[] = [
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
      priceCount: 2,
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
      priceCount: 0,
    },
  ]

  return base.map((row, index) => ({ ...row, ...overrides[index] }))
}

function renderTable(props: Partial<Parameters<typeof ItemsTable>[0]> = {}) {
  return render(
    <ItemsTable
      items={items()}
      defaultCurrency="JMD"
      baseHref="/items"
      formatAmount={formatAmount}
      {...props}
    />
  )
}

describe('ItemsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links each item name to the row under the supplied base href', () => {
    renderTable()

    expect(
      screen.getByRole('link', { name: 'Priority delivery' })
    ).toHaveAttribute('href', '/items/item_1')
  })

  it('scopes links to the host base href rather than a hard-coded path', () => {
    renderTable({ baseHref: '/orgs/acme/workspace/billing/items' })

    expect(
      screen.getByRole('link', { name: 'Priority delivery' })
    ).toHaveAttribute('href', '/orgs/acme/workspace/billing/items/item_1')
  })

  it('renders the type beside the sku, falling back to the unit then No SKU', () => {
    renderTable({
      items: items([{}, { sku: null, unit: 'each' }]),
    })

    expect(screen.getByText(/service · PRIO-1/i)).toBeTruthy()
    expect(screen.getByText(/good · each/i)).toBeTruthy()
  })

  it('falls back to No SKU when neither a sku nor a unit is present', () => {
    renderTable()

    expect(screen.getByText(/good · No SKU/i)).toBeTruthy()
  })

  it('formats an amount through the host formatter', () => {
    renderTable()

    expect(screen.getByText('JMD 19.99')).toBeTruthy()
  })

  it('lets the host formatter decide how a missing amount reads', () => {
    renderTable()

    expect(screen.getByText('Custom pricing')).toBeTruthy()
  })

  it('formats against the row currency, not the workspace default', () => {
    renderTable({
      defaultCurrency: 'USD',
      items: items([{ defaultSellingCurrency: 'CAD' }]),
    })

    expect(screen.getByText('CAD 19.99')).toBeTruthy()
  })

  it('falls back to the workspace default when the row has no currency', () => {
    renderTable({
      defaultCurrency: 'USD',
      items: items([{ defaultSellingCurrency: null }]),
    })

    expect(screen.getByText('USD 19.99')).toBeTruthy()
  })

  it('accepts a serialized decimal string as well as bigint minor units', () => {
    renderTable({ items: items([{ defaultSellingAmount: '1999' }]) })

    expect(screen.getByText('JMD 19.99')).toBeTruthy()
  })

  it('renders the taxable and status labels for every row', () => {
    renderTable()

    expect(screen.getByText('Taxable')).toBeTruthy()
    expect(screen.getByText('Non-taxable')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Archived')).toBeTruthy()
  })

  it('hides the price-count column by default', () => {
    const { container } = renderTable()

    expect(container.textContent).not.toContain('Prices')
  })

  it('shows the price count for each row when the host opts in', () => {
    renderTable({ showPriceCount: true })

    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('renders a zero price count when the row omits priceCount', () => {
    renderTable({
      showPriceCount: true,
      items: items([{ priceCount: undefined }, { priceCount: undefined }]),
    })

    expect(screen.getAllByText('0')).toHaveLength(2)
  })

  it('renders the host empty state when there are no items', () => {
    renderTable({ items: [], emptyState: <div>empty-items</div> })

    expect(screen.getByText('empty-items')).toBeTruthy()
  })

  it('navigates to the row under the base href on row click', async () => {
    const user = userEvent.setup()
    renderTable({ baseHref: '/orgs/acme/workspace/billing/items' })

    const row = screen.getByText('Priority delivery').closest('tr')
    if (row) await user.click(row)

    expect(pushMock).toHaveBeenCalledWith(
      '/orgs/acme/workspace/billing/items/item_1'
    )
  })

  it('does not navigate when the item link itself is clicked', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('link', { name: 'Priority delivery' }))

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('renders every column header, with Actions kept screen-reader only', () => {
    const { container } = renderTable({ showPriceCount: true })

    expect(container.textContent).toContain('Item')
    expect(container.textContent).toContain('Default price')
    expect(container.textContent).toContain('Tax')
    expect(container.textContent).toContain('Prices')
    expect(container.textContent).toContain('Status')
    expect(screen.getByText('Actions')).toHaveClass('sr-only')
  })
})
