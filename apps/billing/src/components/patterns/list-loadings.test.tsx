/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/providers/billing-permissions-provider', () => ({
  useBillingPermission: () => false,
}))

import { BillingListPageSkeleton } from './billing-page-skeleton'
import InvoicesLoading from '@/app/(app)/(sales)/invoices/(list)/loading'
import QuotesLoading from '@/app/(app)/(sales)/quotes/(list)/loading'
import EstimatesLoading from '@/app/(app)/(sales)/estimates/(list)/loading'
import PaymentsLoading from '@/app/(app)/(sales)/payments/(list)/loading'
import CreditNotesLoading from '@/app/(app)/(sales)/credit-notes/(list)/loading'
import VendorsLoading from '@/app/(app)/purchases/vendors/loading'
import ReportsLoading from '@/app/(app)/reports/loading'
import BankingLoading from '@/app/(app)/banking/(list)/loading'

describe('list loading parity', () => {
  it('BillingListPageSkeleton based loadings render same skeleton as base', () => {
    const { container: base } = render(<BillingListPageSkeleton />)
    const baseHeaders = Array.from(base.querySelectorAll('th')).map(
      (h) => h.textContent
    )
    for (const Comp of [
      VendorsLoading,
      ReportsLoading,
      BankingLoading,
    ] as const) {
      const { container } = render(<Comp />)
      // those use BillingListPageSkeleton directly, so HTML equal to base
      const headers = Array.from(container.querySelectorAll('th')).map(
        (h) => h.textContent
      )
      expect(headers).toEqual(baseHeaders)
      expect(container.querySelectorAll('tbody tr').length).toBe(5)
      expect(
        container.querySelector('[data-slot="table-container"]')
      ).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('sales loadings use StreamingResourceToolbar and 4-column skeletons', () => {
    for (const Comp of [
      InvoicesLoading,
      QuotesLoading,
      EstimatesLoading,
      PaymentsLoading,
      CreditNotesLoading,
    ] as const) {
      const { container, unmount } = render(<Comp />)
      const headers = Array.from(container.querySelectorAll('th')).map((h) =>
        h.textContent?.trim()
      )
      expect(headers.length).toBe(4)
      expect(headers).toContain('Status')
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
