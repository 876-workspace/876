/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: () => false,
}))

import InvoicesLoading from '@/app/(app)/(sales)/invoices/(list)/loading'
import QuotesLoading from '@/app/(app)/(sales)/quotes/(list)/loading'
import EstimatesLoading from '@/app/(app)/(sales)/estimates/(list)/loading'
import PaymentsLoading from '@/app/(app)/(sales)/payments/(list)/loading'
import CreditNotesLoading from '@/app/(app)/(sales)/credit-notes/(list)/loading'
import VendorsLoading from '@/app/(app)/purchases/vendors/(list)/loading'
import ReportsLoading from '@/app/(app)/reports/loading'
import BankingLoading from '@/app/(app)/banking/(list)/loading'

describe('list loading parity', () => {
  it('vendors loading mirrors the resolved table columns', () => {
    const { container } = render(<VendorsLoading />)
    const headers = Array.from(container.querySelectorAll('th')).map(
      (heading) => heading.textContent?.trim()
    )
    expect(headers).toEqual(['Vendor', 'Reference', 'Currency', 'Status'])
    expect(container.querySelectorAll('tbody tr')).toHaveLength(5)
  })

  it('reports and banking use shape-matched card fallbacks', () => {
    const { container: reports } = render(<ReportsLoading />)
    const { container: banking } = render(<BankingLoading />)

    expect(reports.textContent).toContain('Reports')
    expect(reports.querySelectorAll('[class~="876-card"]')).toHaveLength(2)
    expect(banking.textContent).toContain('All Bank Accounts')
    expect(banking.querySelectorAll('[class~="876-card"]')).toHaveLength(9)
    expect(reports.querySelector('table')).toBeNull()
    expect(banking.querySelector('table')).toBeNull()
  })

  it('sales loadings mirror each resolved table shape', () => {
    const cases = [
      [InvoicesLoading, 4, true],
      [QuotesLoading, 4, true],
      [EstimatesLoading, 4, true],
      [PaymentsLoading, 3, false],
      [CreditNotesLoading, 5, true],
    ] as const

    for (const [Comp, columnCount, hasStatus] of cases) {
      const { container, unmount } = render(<Comp />)
      const headers = Array.from(container.querySelectorAll('th')).map((h) =>
        h.textContent?.trim()
      )
      expect(headers).toHaveLength(columnCount)
      expect(headers.includes('Status')).toBe(hasStatus)
      expect(container.querySelectorAll('tbody tr').length).toBe(5)
      expect(container.querySelector('[data-slot="page"]')).toBeTruthy()
      unmount()
    }
  })

  it('invoices and quotes loadings have distinct titles but same column count', () => {
    const { container: inv } = render(<InvoicesLoading />)
    const { container: quo } = render(<QuotesLoading />)
    expect(inv.textContent).toContain('Invoices')
    expect(quo.textContent).toContain('Quotes')
    expect(inv.querySelectorAll('th').length).toBe(
      quo.querySelectorAll('th').length
    )
  })

  it('all loadings have no interactive table rows, only skeletons', () => {
    for (const Comp of [
      InvoicesLoading,
      CreditNotesLoading,
      VendorsLoading,
    ] as const) {
      const { container, unmount } = render(<Comp />)
      // skeletons are aria-hidden, no real data rows with links
      expect(container.querySelectorAll('a').length).toBeLessThanOrEqual(1) // toolbar primary may be hidden due to mock false
      expect(
        container.querySelectorAll('[data-slot="skeleton"]').length
      ).toBeGreaterThan(5)
      unmount()
    }
  })
})
