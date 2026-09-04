// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@876/ui/data-table-skeleton', () => ({
  DataTableSkeleton: () => <div>Request table loading</div>,
}))
vi.mock('@876/ui/page', () => ({
  Page: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock('@876/ui/resource-toolbar', () => ({
  ResourceToolbar: ({
    title,
    titleFilter,
  }: {
    title: string
    titleFilter?: ReactNode
  }) => <h1>{titleFilter ?? title}</h1>,
}))
vi.mock('@876/ui/status-filter-heading', () => ({
  StatusFilterHeading: ({ label }: { label: string }) => <span>{label}</span>,
}))
vi.mock('./_components/all-requests-table-data', () => ({
  AllRequestsTableData: () => <div>All requests table data</div>,
}))

import AllRequestsPage from './page'

afterEach(cleanup)

describe('AllRequestsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders its chrome without waiting for request data', async () => {
    render(
      await AllRequestsPage({
        searchParams: Promise.resolve({ status: 'OPEN', after: undefined }),
      })
    )

    expect(
      screen.getByRole('heading', { name: 'All requests' })
    ).toBeInTheDocument()
  })
})
