/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/purchases/vendors',
  useSearchParams: () => state.searchParams,
  useParams: () => ({}),
}))
vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => state.segments,
}))

import { VendorsList } from './vendors-list'
import type { VendorTableRow } from '@/types/vendor'

function createVendor(overrides: Partial<VendorTableRow> = {}): VendorTableRow {
  return {
    id: 'ven_2kL9mN4q',
    name: 'Kingston Freight Co.',
    email: 'accounts@kingstonfreight.example',
    phone: '+18765551000',
    reference: 'VEN-1001',
    defaultCurrency: 'JMD',
    status: 'ACTIVE',
    ...overrides,
  }
}

describe('VendorsList', () => {
  beforeEach(() => {
    state.segments = []
    state.searchParams = new URLSearchParams()
  })

  it('renders the full table when no vendor is open', () => {
    render(<VendorsList vendors={[createVendor()]} />)

    expect(screen.queryByRole('link', { name: /^View vendor/ })).toBeNull()
    expect(screen.getByText('Kingston Freight Co.')).toBeTruthy()
  })

  it('marks the open vendor in the condensed pane', () => {
    state.segments = ['ven_7pQ2rS5t']

    render(
      <VendorsList
        vendors={[
          createVendor(),
          createVendor({ id: 'ven_7pQ2rS5t', name: 'Portmore Supplies' }),
        ]}
      />
    )

    const open = screen.getByRole('link', {
      name: 'View vendor Portmore Supplies',
    })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/purchases/vendors/ven_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View vendor Kingston Freight Co.' })
        .getAttribute('aria-current')
    ).toBeNull()
  })

  it('narrows the pane to the archived vendors when the status filter is archived', () => {
    state.segments = ['ven_2kL9mN4q']
    state.searchParams = new URLSearchParams('status=archived')

    render(
      <VendorsList
        vendors={[
          createVendor(),
          createVendor({
            id: 'ven_7pQ2rS5t',
            name: 'Portmore Supplies',
            status: 'ARCHIVED',
          }),
        ]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View vendor Portmore Supplies' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'View vendor Kingston Freight Co.' })
    ).toBeNull()
  })

  it('carries the active query string onto every record link', () => {
    state.segments = ['ven_2kL9mN4q']
    state.searchParams = new URLSearchParams('status=active')

    render(<VendorsList vendors={[createVendor()]} />)

    expect(
      screen
        .getByRole('link', { name: 'View vendor Kingston Freight Co.' })
        .getAttribute('href')
    ).toBe('/purchases/vendors/ven_2kL9mN4q?status=active')
  })

  it('renders the pane empty state when the filter matches no vendor', () => {
    state.segments = ['ven_2kL9mN4q']
    state.searchParams = new URLSearchParams('status=archived')

    render(<VendorsList vendors={[createVendor()]} />)

    expect(screen.getByText('No vendors yet')).toBeTruthy()
  })
})
