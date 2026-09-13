/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/payments',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import type { PaymentRow } from '@876/billing-ui/payments-table'
import { PaymentsList } from './payments-list'

function createRow(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay_1',
    number: 'PAY-91',
    customerName: 'Alejandra Reyes',
    amount: '50000',
    currency: 'JMD',
    paymentDate: 1_767_225_600,
    status: 'SUCCEEDED',
    depositAccountName: 'Operating account',
    ...overrides,
  }
}

function renderList() {
  return render(
    <PaymentsList
      orgSlug="island-logistics"
      payments={[
        createRow(),
        createRow({
          id: 'pay_2',
          number: 'PAY-92',
          customerName: 'Blue Mountain Trading',
          status: 'PENDING',
        }),
      ]}
    />
  )
}

describe('PaymentsList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no payment open)', () => {
    it('renders the shared table with its column headers', () => {
      renderList()

      expect(
        screen.getByRole('columnheader', { name: 'Payment' })
      ).toBeVisible()
      expect(
        screen.getByRole('columnheader', { name: 'Customer' })
      ).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('PAY-91')).toBeVisible()
      expect(screen.getByText('PAY-92')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList()

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('links each row number to its payment detail route', () => {
      renderList()

      expect(screen.getByRole('link', { name: 'PAY-91' })).toHaveAttribute(
        'href',
        '/island-logistics/payments/pay_1'
      )
    })

    it('filters rows by the statuses the selected filter covers', () => {
      mocks.searchParams = new URLSearchParams('status=pending')

      renderList()

      expect(screen.getByText('PAY-92')).toBeVisible()
      expect(screen.queryByText('PAY-91')).toBeNull()
    })

    it('treats an unknown status as no filter', () => {
      mocks.searchParams = new URLSearchParams('status=bogus')

      renderList()

      expect(screen.getByText('PAY-91')).toBeVisible()
      expect(screen.getByText('PAY-92')).toBeVisible()
    })

    it('names the active filter in the empty state', () => {
      mocks.searchParams = new URLSearchParams('status=failed')

      render(
        <PaymentsList
          orgSlug="island-logistics"
          payments={[createRow({ status: 'SUCCEEDED' })]}
        />
      )

      expect(screen.getByText('No failed payments.')).toBeVisible()
    })
  })

  describe('open (payment beside the list)', () => {
    it('collapses to the condensed pane and marks the open payment', () => {
      mocks.segments = ['pay_2']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View payment PAY-92',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View payment PAY-91' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['pay_2']

      renderList()

      expect(screen.getByText('PENDING')).toBeVisible()
      expect(screen.getByText('SUCCEEDED')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
      expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['pay_1']
      mocks.searchParams = new URLSearchParams('status=completed')

      renderList()

      expect(
        screen.getByRole('link', { name: 'View payment PAY-91' })
      ).toHaveAttribute(
        'href',
        '/island-logistics/payments/pay_1?status=completed'
      )
    })

    it('selects no row while the add form is open', () => {
      mocks.segments = ['new']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      expect(
        screen
          .getAllByRole('link')
          .filter((link) => link.getAttribute('aria-current') === 'true')
      ).toHaveLength(0)
    })

    it('shows an empty pane when the filter leaves no rows', () => {
      mocks.segments = ['pay_1']
      mocks.searchParams = new URLSearchParams('status=failed')

      render(
        <PaymentsList orgSlug="island-logistics" payments={[createRow()]} />
      )

      expect(screen.getByText('No payments')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
