/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/estimates',
  useSearchParams: () => state.searchParams,
  useParams: () => ({}),
}))
vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => state.segments,
}))

import { EstimatesList } from './estimates-list'

type EstimateRow = Parameters<typeof EstimatesList>[0]['estimates'][number]

function createEstimate(overrides: Partial<EstimateRow> = {}): EstimateRow {
  return {
    id: 'est_2kL9mN4q',
    number: 'EST-1001',
    totalAmount: 150000n,
    currency: 'JMD',
    status: 'DRAFT',
    customer: { name: 'Alejandra Reyes' },
    ...overrides,
  } as EstimateRow
}

describe('EstimatesList', () => {
  beforeEach(() => {
    state.segments = []
    state.searchParams = new URLSearchParams()
  })

  it('renders the full table when no estimate is open', () => {
    render(<EstimatesList estimates={[createEstimate()]} />)

    expect(screen.queryByRole('link', { name: /^View estimate/ })).toBeNull()
    expect(screen.getByText('EST-1001')).toBeTruthy()
  })

  it('marks the open estimate in the condensed pane', () => {
    state.segments = ['est_7pQ2rS5t']

    render(
      <EstimatesList
        estimates={[
          createEstimate(),
          createEstimate({ id: 'est_7pQ2rS5t', number: 'EST-1002' }),
        ]}
      />
    )

    const open = screen.getByRole('link', { name: 'View estimate EST-1002' })
    expect(open.getAttribute('aria-current')).toBe('true')
    expect(open.getAttribute('href')).toBe('/estimates/est_7pQ2rS5t')
    expect(
      screen
        .getByRole('link', { name: 'View estimate EST-1001' })
        .getAttribute('aria-current')
    ).toBeNull()
  })

  it('narrows the pane to the accepted estimates when the status filter is accepted', () => {
    state.segments = ['est_2kL9mN4q']
    state.searchParams = new URLSearchParams('status=accepted')

    render(
      <EstimatesList
        estimates={[
          createEstimate(),
          createEstimate({
            id: 'est_7pQ2rS5t',
            number: 'EST-1002',
            status: 'ACCEPTED',
          }),
        ]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View estimate EST-1002' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('link', { name: 'View estimate EST-1001' })
    ).toBeNull()
  })

  it('carries the active query string onto every record link', () => {
    state.segments = ['est_2kL9mN4q']
    state.searchParams = new URLSearchParams('status=draft')

    render(<EstimatesList estimates={[createEstimate()]} />)

    expect(
      screen
        .getByRole('link', { name: 'View estimate EST-1001' })
        .getAttribute('href')
    ).toBe('/estimates/est_2kL9mN4q?status=draft')
  })

  it('renders the pane empty state when the filter matches no estimate', () => {
    state.segments = ['est_2kL9mN4q']
    state.searchParams = new URLSearchParams('status=expired')

    render(<EstimatesList estimates={[createEstimate()]} />)

    expect(screen.getByText('No estimates yet')).toBeTruthy()
  })
})
