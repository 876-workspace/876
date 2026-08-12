/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/items',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: () => true,
}))

import Loading from './loading'
import { ITEMS_SKELETON_COLUMNS } from '../_components/items-skeleton-columns'

describe('Items Loading', () => {
  it('renders items toolbar and skeleton with 6 columns', () => {
    const { container } = render(<Loading />)
    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )
    // Actions is srOnly so text is inside sr-only span, still trimmed
    expect(headers.length).toBe(6)
    expect(headers).toContain('Item')
    expect(headers).toContain('Status')
  })

  it('matches ITEMS_SKELETON_COLUMNS labels', () => {
    const { container } = render(<Loading />)
    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )
    expect(headers).toEqual(ITEMS_SKELETON_COLUMNS.map((c) => c.label))
  })

  it('renders 5 rows', () => {
    const { container } = render(<Loading />)
    expect(container.querySelectorAll('tbody tr').length).toBe(5)
  })

  it('has Page wrapper and Items title', () => {
    const { container } = render(<Loading />)
    expect(container.querySelector('[data-slot="page"]')).toBeTruthy()
    expect(container.textContent).toContain('Items')
  })
})
