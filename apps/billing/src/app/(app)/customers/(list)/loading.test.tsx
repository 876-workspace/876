/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: () => false,
}))

import Loading from './loading'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'

describe('Customers Loading', () => {
  it('renders customers toolbar with status all and correct skeleton columns', () => {
    const { container } = render(<Loading />)
    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )
    expect(headers).toEqual(CUSTOMERS_SKELETON_COLUMNS.map((c) => c.label))
    expect(container.querySelectorAll('tbody tr').length).toBe(5)
  })

  it('contains Page wrapper', () => {
    const { container } = render(<Loading />)
    expect(container.querySelector('[data-slot="page"]')).toBeTruthy()
  })

  it('has Customers heading', () => {
    const { container } = render(<Loading />)
    expect(container.textContent).toContain('Customers')
  })

  it('table is aria-hidden', () => {
    const { container } = render(<Loading />)
    expect(
      container.querySelector('[data-slot="table-container"]')
    ).toHaveAttribute('aria-hidden', 'true')
  })
})
