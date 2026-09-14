/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PackageTableRow } from './packages-table'

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  detailSegments: [] as string[],
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}))
vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => mocks.detailSegments,
}))

import { PackagesList } from './packages-list'

const packages: PackageTableRow[] = [
  {
    id: 'pkg_1',
    customerName: 'Kimani Grant',
    description: 'Laptop',
    trackingNumber: 'TRK-1',
    branch: 'Kingston',
    category: 'Fragile',
    categoryId: 'pcat_fragile',
    status: 'Pre-alert',
    statusCode: 'PRE_ALERT',
  },
  {
    id: 'pkg_2',
    customerName: 'Asha Brown',
    description: 'Shoes',
    trackingNumber: 'TRK-2',
    branch: 'Portmore',
    category: 'Standard',
    categoryId: 'pcat_standard',
    status: 'Collected',
    statusCode: 'COLLECTED',
  },
  {
    id: 'pkg_3',
    customerName: 'Jamal Reid',
    description: 'Documents',
    trackingNumber: 'TRK-3',
    branch: 'Kingston',
    category: 'Fragile',
    categoryId: 'pcat_fragile',
    status: 'Collected',
    statusCode: 'COLLECTED',
  },
]

function renderList() {
  return render(
    <PackagesList
      packages={packages}
      orgSlug="island-logistics"
      emptyState={<span>No packages</span>}
    />
  )
}

describe('PackagesList', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams()
    mocks.detailSegments = []
  })

  it('shows all rows without filters', () => {
    renderList()

    expect(screen.getByText('TRK-1')).toBeVisible()
    expect(screen.getByText('TRK-2')).toBeVisible()
    expect(screen.getByText('TRK-3')).toBeVisible()
  })

  it('filters rows by status from the URL', () => {
    mocks.searchParams = new URLSearchParams('status=COLLECTED')
    renderList()

    expect(screen.queryByText('TRK-1')).not.toBeInTheDocument()
    expect(screen.getByText('TRK-2')).toBeVisible()
    expect(screen.getByText('TRK-3')).toBeVisible()
  })

  it('filters rows by category from the URL', () => {
    mocks.searchParams = new URLSearchParams('category=pcat_fragile')
    renderList()

    expect(screen.getByText('TRK-1')).toBeVisible()
    expect(screen.queryByText('TRK-2')).not.toBeInTheDocument()
    expect(screen.getByText('TRK-3')).toBeVisible()
  })

  it('combines status and category filters', () => {
    mocks.searchParams = new URLSearchParams(
      'status=COLLECTED&category=pcat_fragile'
    )
    renderList()

    expect(screen.queryByText('TRK-1')).not.toBeInTheDocument()
    expect(screen.queryByText('TRK-2')).not.toBeInTheDocument()
    expect(screen.getByText('TRK-3')).toBeVisible()
  })

  it('shows the empty state for an unknown category', () => {
    mocks.searchParams = new URLSearchParams('category=pcat_unknown')
    renderList()

    expect(screen.getByText('No packages')).toBeVisible()
  })

  it('uses filtered rows in the condensed pane', () => {
    mocks.searchParams = new URLSearchParams('category=pcat_standard')
    mocks.detailSegments = ['pkg_1']
    renderList()

    expect(screen.queryByText('TRK-1')).not.toBeInTheDocument()
    expect(screen.getByText('TRK-2')).toBeVisible()
    expect(screen.queryByText('TRK-3')).not.toBeInTheDocument()
  })
})
