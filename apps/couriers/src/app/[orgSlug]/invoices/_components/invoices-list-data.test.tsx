/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  listInvoices: vi.fn(),
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  billingIntegration: { invoices: { list: mocks.listInvoices } },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/invoices',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { InvoicesListData } from './invoices-list-data'
import { INVOICES_SKELETON_COLUMNS } from './invoices-skeleton-columns'

function createInvoice(overrides: Record<string, unknown> = {}) {
  return {
    object: 'invoice',
    id: 'inv_1',
    number: 'INV-1042',
    status: 'SENT',
    currency: 'JMD',
    totalAmount: '250000',
    amountDue: '100000',
    customer: { object: 'customer', id: 'cus_1', name: 'Alejandra Reyes' },
    ...overrides,
  }
}

function listResult<T>(data: T[]) {
  return {
    data: { object: 'list', data, has_more: false, url: '/t', total_count: 0 },
    error: null,
  }
}

describe('InvoicesListData', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      tenant: { id: 'tenant_123' },
    })
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders finance invoices through the shared table with org-scoped links', async () => {
    mocks.listInvoices.mockResolvedValue(listResult([createInvoice()]))

    const { container } = render(
      await InvoicesListData({ orgSlug: 'island-logistics' })
    )

    expect(screen.getByRole('link', { name: 'INV-1042' })).toHaveAttribute(
      'href',
      '/island-logistics/invoices/inv_1'
    )
    expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    expect(screen.getByText(/2,500\.00/)).toBeVisible()
    expect(screen.getByText(/1,000\.00/)).toBeVisible()
    expect(mocks.listInvoices).toHaveBeenCalledTimes(1)
    expect(mocks.listInvoices).toHaveBeenCalledWith('org_123')
    expect(
      Array.from(container.querySelectorAll('th')).map((th) =>
        th.textContent?.trim()
      )
    ).toEqual(INVOICES_SKELETON_COLUMNS.map((column) => column.label))
  })

  it('loads every invoice so the client list can filter by status', async () => {
    mocks.listInvoices.mockResolvedValue(
      listResult([
        createInvoice(),
        createInvoice({ id: 'inv_2', number: 'INV-1043', status: 'PAID' }),
      ])
    )
    mocks.searchParams = new URLSearchParams('status=paid')

    render(await InvoicesListData({ orgSlug: 'island-logistics' }))

    expect(mocks.listInvoices).toHaveBeenCalledWith('org_123')
    expect(screen.getByText('INV-1043')).toBeVisible()
    expect(screen.queryByText('INV-1042')).toBeNull()
  })

  it('keeps the table shell and shows the service message when the list fails', async () => {
    mocks.listInvoices.mockResolvedValue({
      data: null,
      error: { code: 'billing/internal', message: 'Invoices could not load.' },
    })

    render(await InvoicesListData({ orgSlug: 'island-logistics' }))

    expect(screen.getByRole('columnheader', { name: 'Invoice' })).toBeVisible()
    expect(screen.getByText('Invoices could not load.')).toBeVisible()
  })

  it('shows no error banner when the Billing workspace is missing', async () => {
    mocks.listInvoices.mockResolvedValue({
      data: null,
      error: {
        code: 'billing/tenant-not-found',
        message: 'Missing workspace.',
      },
    })

    render(await InvoicesListData({ orgSlug: 'island-logistics' }))

    expect(screen.queryByText('Missing workspace.')).not.toBeInTheDocument()
    expect(screen.getByText('No invoices')).toBeVisible()
  })

  it('does not call Billing when the org has no tenant', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    render(await InvoicesListData({ orgSlug: 'island-logistics' }))

    expect(mocks.listInvoices).not.toHaveBeenCalled()
    expect(screen.getByText('No invoices')).toBeVisible()
  })
})
