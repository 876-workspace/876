// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { WidgetsList } from './widgets-list'
import type { WidgetTableRow } from './widgets-table'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/widgets',
}))

vi.mock('./widgets-table', () => ({
  WidgetsTable: ({ data }: { data: WidgetTableRow[] }) => (
    <div data-testid="widgets-table">
      {data.map((row) => (
        <span key={row.id}>{row.name}</span>
      ))}
    </div>
  ),
}))

function widgetRow(overrides: Partial<WidgetTableRow> = {}): WidgetTableRow {
  return {
    kind: 'widget',
    id: 'notepad',
    name: 'Notepad',
    description: 'Notes widget',
    detailHref: '/widgets/notepad',
    visual: { kind: 'icon', icon: 'notebook' },
    apps: 'all',
    feature: { id: 'feat_1', name: 'Notepad', enabled: true },
    missingFeatureSlug: null,
    ...overrides,
  } as WidgetTableRow
}

const rows: WidgetTableRow[] = [
  widgetRow(),
  widgetRow({
    id: 'live_logs',
    name: 'Live logs',
    description: 'Console audit view',
    detailHref: '/widgets/live-logs',
    apps: ['Console'],
    feature: null,
    missingFeatureSlug: 'console-widgets-live-logs',
  }),
]

describe('WidgetsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the full table when no widget is open', () => {
    render(<WidgetsList rows={rows} />)

    expect(screen.getByTestId('widgets-table')).toBeInTheDocument()
    expect(screen.getByText('Notepad')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="list-pane"]')).toBeNull()
  })

  it('renders the condensed pane with a selected row when a widget is open', () => {
    mocks.segments = ['notepad']
    render(<WidgetsList rows={rows} />)

    expect(screen.queryByTestId('widgets-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View Notepad widget' })
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('link', { name: 'View Live logs widget' })
    ).not.toHaveAttribute('aria-current')
  })

  it('preserves the list query in pane links', () => {
    mocks.segments = ['notepad']
    mocks.searchParams = new URLSearchParams('distribution=all')
    render(<WidgetsList rows={rows} />)

    expect(
      screen.getByRole('link', { name: 'View Notepad widget' })
    ).toHaveAttribute('href', '/widgets/notepad?distribution=all')
  })

  it('filters by distribution client-side', () => {
    mocks.searchParams = new URLSearchParams('distribution=shared')
    render(<WidgetsList rows={rows} />)

    // Live logs is host-distributed, so only Notepad remains.
    expect(screen.getByText('Notepad')).toBeInTheDocument()
    expect(screen.queryByText('Live logs')).toBeNull()
  })
})
