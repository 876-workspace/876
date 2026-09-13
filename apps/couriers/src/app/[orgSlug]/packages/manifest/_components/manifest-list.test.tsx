/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/packages/manifest',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import type { ManifestTableRow } from './manifest-table'
import { ManifestList } from './manifest-list'

function createRow(
  overrides: Partial<ManifestTableRow> = {}
): ManifestTableRow {
  return {
    id: 'mnf_1',
    reference: 'MNF-7001',
    packages: '42',
    status: 'draft',
    ...overrides,
  }
}

function renderList() {
  return render(
    <ManifestList
      orgSlug="island-logistics"
      manifests={[
        createRow(),
        createRow({
          id: 'mnf_2',
          reference: 'MNF-7002',
          packages: '18',
          status: 'arrived',
        }),
      ]}
    />
  )
}

describe('ManifestList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no manifest open)', () => {
    it('renders the full table with its column headers', () => {
      renderList()

      expect(
        screen.getByRole('columnheader', { name: 'Reference' })
      ).toBeVisible()
      expect(
        screen.getByRole('columnheader', { name: 'Packages' })
      ).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('MNF-7001')).toBeVisible()
      expect(screen.getByText('MNF-7002')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList()

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('links each row reference to its manifest detail route', () => {
      renderList()

      expect(screen.getByRole('link', { name: 'MNF-7001' })).toHaveAttribute(
        'href',
        '/island-logistics/packages/manifest/mnf_1'
      )
    })

    it('filters rows by manifest status', () => {
      mocks.searchParams = new URLSearchParams('status=arrived')

      renderList()

      expect(screen.getByText('MNF-7002')).toBeVisible()
      expect(screen.queryByText('MNF-7001')).toBeNull()
    })

    it('treats an unknown status as no filter', () => {
      mocks.searchParams = new URLSearchParams('status=teleported')

      renderList()

      expect(screen.getByText('MNF-7001')).toBeVisible()
      expect(screen.getByText('MNF-7002')).toBeVisible()
    })

    it('names the active filter in the empty state', () => {
      mocks.searchParams = new URLSearchParams('status=draft')

      render(
        <ManifestList
          orgSlug="island-logistics"
          manifests={[createRow({ status: 'arrived' })]}
        />
      )

      expect(screen.getByText('No draft manifests.')).toBeVisible()
    })
  })

  describe('open (manifest beside the list)', () => {
    it('collapses to the condensed pane and marks the open manifest', () => {
      mocks.segments = ['mnf_2']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View manifest MNF-7002',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View manifest MNF-7001' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['mnf_2']

      renderList()

      expect(screen.getByText('arrived')).toBeVisible()
      expect(screen.getByText('draft')).toBeVisible()
      expect(screen.getByText('42 packages')).toBeVisible()
      expect(screen.getByText('18 packages')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['mnf_1']
      mocks.searchParams = new URLSearchParams('status=draft')

      renderList()

      expect(
        screen.getByRole('link', { name: 'View manifest MNF-7001' })
      ).toHaveAttribute(
        'href',
        '/island-logistics/packages/manifest/mnf_1?status=draft'
      )
    })

    it('selects no row while the add form is open', () => {
      mocks.segments = ['new']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      expect(
        screen
          .getAllByRole('link')
          .filter((link) => link.getAttribute('aria-current') === 'true')
      ).toHaveLength(0)
    })

    it('shows an empty pane when the filter leaves no rows', () => {
      mocks.segments = ['mnf_1']
      mocks.searchParams = new URLSearchParams('status=cleared')

      render(
        <ManifestList orgSlug="island-logistics" manifests={[createRow()]} />
      )

      expect(screen.getByText('No manifests')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
