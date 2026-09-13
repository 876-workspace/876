/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  listInvoices: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/billing', () => ({
  billingIntegration: { invoices: { list: mocks.listInvoices } },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import { InvoicesTableData } from './invoices-table-data'
import { INVOICES_SKELETON_COLUMNS } from './invoices-skeleton-columns'

const params = Promise.resolve({ orgSlug: 'island-logistics' })

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

describe('InvoicesTableData', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      tenant: { id: 'tenant_123' },
    })
  })

  it('renders finance invoices through the shared table with org-scoped links', async () => {
    mocks.listInvoices.mockResolvedValue(listResult([createInvoice()]))

    const { container } = render(
      await InvoicesTableData({ params, searchParams: Promise.resolve({}) })
    )

    expect(screen.getByRole('link', { name: 'INV-1042' })).toHaveAttribute(
      'href',
      '/island-logistics/invoices/inv_1'
    )
    expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    expect(screen.getByText(/2,500\.00/)).toBeVisible()
    expect(screen.getByText(/1,000\.00/)).toBeVisible()
    expect(mocks.listInvoices).toHaveBeenCalledTimes(1)
    expect(mocks.listInvoices).toHaveBeenCalledWith('org_123', {
      status: undefined,
    })
    expect(
      Array.from(container.querySelectorAll('th')).map((th) =>
        th.textContent?.trim()
      )
    ).toEqual(INVOICES_SKELETON_COLUMNS.map((column) => column.label))
  })

  it('threads a known status into the list call as the Billing status', async () => {
    mocks.listInvoices.mockResolvedValue(listResult([]))

    render(
      await InvoicesTableData({
        params,
        searchParams: Promise.resolve({ status: 'overdue' }),
      })
    )

    expect(mocks.listInvoices).toHaveBeenCalledWith('org_123', {
      status: 'OVERDUE',
    })
    expect(screen.getByText('No overdue invoices.')).toBeVisible()
  })

  it('ignores an unknown status', async () => {
    mocks.listInvoices.mockResolvedValue(listResult([]))

    render(
      await InvoicesTableData({
        params,
        searchParams: Promise.resolve({ status: 'bogus' }),
      })
    )

    expect(mocks.listInvoices).toHaveBeenCalledWith('org_123', {
      status: undefined,
    })
    expect(screen.getByText('No invoices yet.')).toBeVisible()
  })

  it('keeps the table shell and shows the service message when the list fails', async () => {
    mocks.listInvoices.mockResolvedValue({
      data: null,
      error: { code: 'billing/internal', message: 'Invoices could not load.' },
    })

    render(
      await InvoicesTableData({ params, searchParams: Promise.resolve({}) })
    )

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

    render(
      await InvoicesTableData({ params, searchParams: Promise.resolve({}) })
    )

    expect(screen.queryByText('Missing workspace.')).not.toBeInTheDocument()
    expect(screen.getByText('No invoices')).toBeVisible()
  })

  it('does not call Billing when the org has no tenant', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    render(
      await InvoicesTableData({ params, searchParams: Promise.resolve({}) })
    )

    expect(mocks.listInvoices).not.toHaveBeenCalled()
    expect(screen.getByText('No invoices')).toBeVisible()
  })
})
