/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const pushMock = vi.fn()
const navigationState = {
  segments: [] as string[],
  query: '',
}
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigationState.query),
  useSelectedLayoutSegments: () => navigationState.segments,
  usePathname: () => '/recurring-invoices',
}))

import {
  formatRecurringFrequency,
  RecurringInvoicesList,
  type RecurringInvoiceRow,
} from './recurring-invoices-list'

function formatAmount(amount: bigint | string, currency: string): string {
  return `${currency} ${(Number(amount) / 100).toFixed(2)}`
}

function formatDate(timestamp: number): string {
  return `d${timestamp}`
}

function profile(overrides: Partial<RecurringInvoiceRow> = {}): RecurringInvoiceRow {
  return {
    id: 'rinv_1',
    profileName: 'Monthly retainer',
    customer: { name: 'Alejandra Reyes' },
    frequency: { intervalUnit: 'month', intervalCount: 1 },
    totalAmount: '4500000',
    currency: 'JMD',
    status: 'active',
    nextRunAt: 1767225600,
    lastRunAt: 1764547200,
    generatedCount: 2,
    ...overrides,
  }
}

function renderList(
  profiles: RecurringInvoiceRow[],
  emptyState?: React.ReactNode
) {
  return render(
    <RecurringInvoicesList
      profiles={profiles}
      baseHref="/recurring-invoices"
      formatAmount={formatAmount}
      formatDate={formatDate}
      emptyState={emptyState}
    />
  )
}

describe('RecurringInvoicesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigationState.segments = []
    navigationState.query = ''
  })

  it('renders the profile row with status, frequency, and next run', () => {
    // ARRANGE
    const rows = [profile()]

    // ACT
    renderList(rows)

    // ASSERT
    expect(screen.getByText('Monthly retainer')).toBeVisible()
    expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    expect(screen.getByText('Every month')).toBeVisible()
    expect(screen.getByText('d1767225600')).toBeVisible()
    expect(screen.getByText('JMD 45000.00')).toBeVisible()
    expect(screen.getByText('active')).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('renders an em dash when the profile has never run', () => {
    // ARRANGE
    renderList([profile({ nextRunAt: null, lastRunAt: null })])

    // ACT — no interaction needed; the dashes render with the row.

    // ASSERT
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)

    // AFTER — testing-library performs cleanup.
  })

  it('renders the supplied empty state instead of rows when there are no profiles', () => {
    // ARRANGE
    renderList([], <p>No recurring invoices yet</p>)

    // ACT — no interaction needed.

    // ASSERT
    expect(screen.getByText('No recurring invoices yet')).toBeVisible()
    expect(screen.queryByText('Monthly retainer')).toBeNull()

    // AFTER — testing-library performs cleanup.
  })

  it('keeps the table chrome mounted with zero rows when no empty state is given', () => {
    // ARRANGE
    renderList([])

    // ACT — no interaction needed.

    // ASSERT
    expect(screen.getByText('Profile')).toBeVisible()
    expect(screen.getByText('Next run')).toBeVisible()
    expect(screen.queryByText('Monthly retainer')).toBeNull()

    // AFTER — testing-library performs cleanup.
  })

  it('marks the open profile in the condensed pane', () => {
    // ARRANGE
    navigationState.segments = ['rinv_2']
    renderList([
      profile(),
      profile({ id: 'rinv_2', profileName: 'Quarterly audit' }),
    ])

    // ACT — no interaction needed; the pane renders from the URL segments.

    // ASSERT
    const open = screen.getByRole('link', {
      name: 'View recurring invoice Quarterly audit',
    })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(
      screen
        .getByRole('link', { name: 'View recurring invoice Monthly retainer' })
        .getAttribute('aria-current')
    ).toBeNull()

    // AFTER — testing-library performs cleanup.
  })

  it('carries the active query string onto every record link', () => {
    // ARRANGE
    navigationState.segments = ['rinv_1']
    navigationState.query = 'status=active'
    renderList([profile()])

    // ACT — no interaction needed.

    // ASSERT
    expect(
      screen
        .getByRole('link', { name: 'View recurring invoice Monthly retainer' })
        .getAttribute('href')
    ).toBe('/recurring-invoices/rinv_1?status=active')

    // AFTER — testing-library performs cleanup.
  })
})

describe('formatRecurringFrequency', () => {
  it('labels a singular interval without a count', () => {
    expect(formatRecurringFrequency('month', 1)).toBe('Every month')
  })

  it('labels a plural interval with its count', () => {
    expect(formatRecurringFrequency('month', 2)).toBe('Every 2 months')
  })

  it('falls back to a plain label for unknown units and counts', () => {
    expect(formatRecurringFrequency('fortnight', 2)).toBe('Recurring')
    expect(formatRecurringFrequency('month', 0)).toBe('Recurring')
  })
})
