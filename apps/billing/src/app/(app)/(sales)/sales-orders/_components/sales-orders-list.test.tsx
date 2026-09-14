/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ searchParams: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}))
vi.mock('@876/ui/list-detail-shell', () => ({ useDetailSegments: () => [] }))
vi.mock('./sales-orders-table', () => ({
  SalesOrdersTable: ({ orders }: { orders: Array<{ id: string }> }) => (
    <div>{orders.map((order) => order.id).join(',')}</div>
  ),
}))

import { SalesOrdersList } from './sales-orders-list'

const orders = [
  {
    id: 'so_draft',
    number: 'SO-1',
    customerName: 'Ana',
    currency: 'USD',
    totalAmount: '100',
    status: 'draft',
    invoicingStatus: 'not-invoiced',
  },
  {
    id: 'so_confirmed',
    number: 'SO-2',
    customerName: 'Bo',
    currency: 'USD',
    totalAmount: '100',
    status: 'confirmed',
    invoicingStatus: 'not-invoiced',
  },
]

describe('SalesOrdersList', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams()
  })

  it('matches Quotes by filtering the loaded split-list rows on the selected status', () => {
    mocks.searchParams = new URLSearchParams('status=confirmed')
    render(<SalesOrdersList orders={orders} />)
    expect(screen.getByText('so_confirmed')).toBeVisible()
    expect(screen.queryByText('so_draft')).toBeNull()
  })
})
