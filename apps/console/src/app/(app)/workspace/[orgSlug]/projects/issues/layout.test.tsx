// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  notFound: vi.fn(),
  resolveOrg: vi.fn(),
  issuesData: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/workspace/efesto/projects/issues',
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/features/orgs/org-data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

vi.mock('@/features/projects/components/issues-data', () => ({
  IssuesData: (props: Record<string, unknown>) => {
    mocks.issuesData(props)
    return <div>Issues Data</div>
  },
}))

import OrganizationIssuesLayout from './layout'
import OrganizationIssuesPage from './(list)/page'

describe('the organization Issues list route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.notFound.mockImplementation(() => {
      throw new Error('not found')
    })
    mocks.searchParams = new URLSearchParams()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      name: 'Efesto',
      slug: 'efesto',
    })
  })

  afterEach(cleanup)

  describe('layout', () => {
    it('renders its children directly, so a record owns the whole page', () => {
      render(
        <OrganizationIssuesLayout>
          {<div>Record Content</div>}
        </OrganizationIssuesLayout>
      )

      expect(screen.getByText('Record Content')).toBeInTheDocument()
    })

    it('mounts no list/detail shell, so a record does not open beside the list', () => {
      const { container } = render(
        <OrganizationIssuesLayout>
          {<div>Record Content</div>}
        </OrganizationIssuesLayout>
      )

      expect(
        container.querySelector('[data-slot="list-detail-shell"]')
      ).toBeNull()
    })
  })

  describe('list page', () => {
    it('renders the toolbar the layout no longer owns', async () => {
      render(
        await OrganizationIssuesPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({}),
        })
      )

      expect(
        screen.getByRole('heading', { name: 'All Issues' })
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
        'href',
        '/workspace/efesto/projects/issues/new'
      )
    })

    it('passes no status filter when the query string carries none', async () => {
      render(
        await OrganizationIssuesPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({}),
        })
      )

      expect(mocks.issuesData).toHaveBeenCalledTimes(1)
      expect(mocks.issuesData).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_123',
          status: undefined,
        })
      )
    })

    it('threads a recognised status through to the list request', async () => {
      render(
        await OrganizationIssuesPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({ status: 'in-progress' }),
        })
      )

      expect(mocks.issuesData).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in-progress' })
      )
    })

    it('drops an unrecognised status rather than forwarding it', async () => {
      render(
        await OrganizationIssuesPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({ status: 'not-a-status' }),
        })
      )

      expect(mocks.issuesData).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      )
    })

    it('stops before mounting the list when the organization does not resolve', async () => {
      mocks.resolveOrg.mockResolvedValue(null)

      await expect(
        OrganizationIssuesPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('not found')

      expect(mocks.notFound).toHaveBeenCalledTimes(1)
      expect(mocks.issuesData).not.toHaveBeenCalled()
    })
  })
})
