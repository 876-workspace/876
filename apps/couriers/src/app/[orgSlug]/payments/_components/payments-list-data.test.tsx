/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  listPayments: vi.fn(),
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  billingIntegration: { payments: { list: mocks.listPayments } },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/payments',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { PaymentsListData } from './payments-list-data'
import { PAYMENTS_SKELETON_COLUMNS } from './payments-skeleton-columns'

function createPayment(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment',
    id: 'pay_1',
    number: 'PAY-91',
    amount: '50000',
    currency: 'JMD',
    paymentDate: 1_767_225_600,
    status: 'SUCCEEDED',
    customer: { object: 'customer', id: 'cus_1', name: 'Alejandra Reyes' },
    depositAccount: { name: 'Operating account' },
    ...overrides,
  }
}

function listResult<T>(data: T[]) {
  return {
    data: { object: 'list', data, has_more: false, url: '/t', total_count: 0 },
    error: null,
  }
}

describe('PaymentsListData', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      tenant: { id: 'tenant_123' },
    })
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders finance payments through the shared table with org-scoped links', async () => {
    mocks.listPayments.mockResolvedValue(listResult([createPayment()]))

    const { container } = render(
      await PaymentsListData({ orgSlug: 'island-logistics' })
    )

    expect(screen.getByRole('link', { name: 'PAY-91' })).toHaveAttribute(
      'href',
      '/island-logistics/payments/pay_1'
    )
    expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    expect(screen.getByText('Operating account')).toBeVisible()
    expect(screen.getByText(/500\.00/)).toBeVisible()
    expect(mocks.listPayments).toHaveBeenCalledTimes(1)
    expect(mocks.listPayments).toHaveBeenCalledWith('org_123')
    expect(
      Array.from(container.querySelectorAll('th')).map((th) =>
        th.textContent?.trim()
      )
    ).toEqual(PAYMENTS_SKELETON_COLUMNS.map((column) => column.label))
  })

  it('narrows rows to the Billing statuses the selected filter covers', async () => {
    mocks.listPayments.mockResolvedValue(
      listResult([
        createPayment(),
        createPayment({ id: 'pay_2', number: 'PAY-92', status: 'REFUNDED' }),
        createPayment({
          id: 'pay_3',
          number: 'PAY-93',
          status: 'PARTIALLY_REFUNDED',
        }),
      ])
    )
    mocks.searchParams = new URLSearchParams('status=refunded')

    render(await PaymentsListData({ orgSlug: 'island-logistics' }))

    expect(mocks.listPayments).toHaveBeenCalledWith('org_123')
    expect(screen.queryByText('PAY-91')).not.toBeInTheDocument()
    expect(screen.getByText('PAY-92')).toBeVisible()
    expect(screen.getByText('PAY-93')).toBeVisible()
  })

  it('shows the filtered empty message when nothing matches', async () => {
    mocks.listPayments.mockResolvedValue(listResult([createPayment()]))
    mocks.searchParams = new URLSearchParams('status=failed')

    render(await PaymentsListData({ orgSlug: 'island-logistics' }))

    expect(screen.getByText('No failed payments.')).toBeVisible()
  })

  it('keeps the table shell and shows the service message when the list fails', async () => {
    mocks.listPayments.mockResolvedValue({
      data: null,
      error: { code: 'billing/internal', message: 'Payments could not load.' },
    })

    render(await PaymentsListData({ orgSlug: 'island-logistics' }))

    expect(screen.getByRole('columnheader', { name: 'Payment' })).toBeVisible()
    expect(screen.getByText('Payments could not load.')).toBeVisible()
  })

  it('shows no error banner when the Billing workspace is missing', async () => {
    mocks.listPayments.mockResolvedValue({
      data: null,
      error: { code: 'billing/unreachable', message: 'Billing unreachable.' },
    })

    render(await PaymentsListData({ orgSlug: 'island-logistics' }))

    expect(screen.queryByText('Billing unreachable.')).not.toBeInTheDocument()
    expect(screen.getByText('No payments')).toBeVisible()
  })

  it('does not call Billing when the org has no tenant', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    render(await PaymentsListData({ orgSlug: 'island-logistics' }))

    expect(mocks.listPayments).not.toHaveBeenCalled()
    expect(screen.getByText('No payments')).toBeVisible()
  })
})
