// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  getPlatformOrganization: vi.fn(),
  issuesData: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/projects/issues',
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/platform-org', () => ({
  getPlatformOrganization: mocks.getPlatformOrganization,
}))

vi.mock('@/features/projects/components/issues-data', () => ({
  IssuesData: (props: Record<string, unknown>) => {
    mocks.issuesData(props)
    return <div>Issues Data</div>
  },
}))

import PlatformIssuesLayout from './layout'
import PlatformIssuesPage from './(list)/page'

describe('the platform Issues list route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = new URLSearchParams()
    mocks.getPlatformOrganization.mockResolvedValue({ id: 'org_platform' })
  })

  afterEach(cleanup)

  describe('layout', () => {
    it('renders its children directly, so a record owns the whole page', () => {
      render(
        <PlatformIssuesLayout>{<div>Record Content</div>}</PlatformIssuesLayout>
      )

      expect(screen.getByText('Record Content')).toBeInTheDocument()
    })

    it('mounts no list/detail shell, so a record does not open beside the list', () => {
      const { container } = render(
        <PlatformIssuesLayout>{<div>Record Content</div>}</PlatformIssuesLayout>
      )

      expect(
        container.querySelector('[data-slot="list-detail-shell"]')
      ).toBeNull()
    })
  })

  describe('list page', () => {
    it('renders the toolbar the layout no longer owns', async () => {
      render(await PlatformIssuesPage({ searchParams: Promise.resolve({}) }))

      expect(
        screen.getByRole('heading', { name: 'All Issues' })
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
        'href',
        '/projects/issues/new'
      )
    })

    it('passes no status filter when the query string carries none', async () => {
      render(await PlatformIssuesPage({ searchParams: Promise.resolve({}) }))

      expect(mocks.issuesData).toHaveBeenCalledTimes(1)
      expect(mocks.issuesData).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_platform',
          status: undefined,
        })
      )
    })

    it('threads a recognised status through to the list request', async () => {
      render(
        await PlatformIssuesPage({
          searchParams: Promise.resolve({ status: 'in-progress' }),
        })
      )

      expect(mocks.issuesData).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in-progress' })
      )
    })

    it('drops an unrecognised status rather than forwarding it', async () => {
      render(
        await PlatformIssuesPage({
          searchParams: Promise.resolve({ status: 'not-a-status' }),
        })
      )

      expect(mocks.issuesData).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      )
    })

    it('renders the unavailable state instead of the list when no platform organization resolves', async () => {
      mocks.getPlatformOrganization.mockResolvedValue(null)

      render(await PlatformIssuesPage({ searchParams: Promise.resolve({}) }))

      expect(mocks.issuesData).not.toHaveBeenCalled()
      expect(screen.queryByRole('link', { name: 'Add' })).toBeNull()
    })
  })
})
