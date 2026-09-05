// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  notFound: vi.fn(),
  resolveOrg: vi.fn(),
  projectsData: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/workspace/efesto/projects/projects',
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/features/orgs/org-data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

vi.mock('@/features/projects/components/projects-data', () => ({
  ProjectsData: (props: Record<string, unknown>) => {
    mocks.projectsData(props)
    return <div>Projects Data</div>
  },
}))

import OrganizationProjectsLayout from './layout'
import OrganizationProjectsPage from './(list)/page'

describe('the organization Projects list route', () => {
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
        <OrganizationProjectsLayout>
          {<div>Record Content</div>}
        </OrganizationProjectsLayout>
      )

      expect(screen.getByText('Record Content')).toBeInTheDocument()
    })

    it('mounts no list/detail shell, so a record does not open beside the list', () => {
      const { container } = render(
        <OrganizationProjectsLayout>
          {<div>Record Content</div>}
        </OrganizationProjectsLayout>
      )

      expect(
        container.querySelector('[data-slot="list-detail-shell"]')
      ).toBeNull()
    })
  })

  describe('list page', () => {
    it('renders the toolbar the layout no longer owns', async () => {
      render(
        await OrganizationProjectsPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({}),
        })
      )

      expect(
        screen.getByRole('heading', { name: 'All Projects' })
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
        'href',
        '/workspace/efesto/projects/projects/new'
      )
    })

    it('passes no status filter when the query string carries none', async () => {
      render(
        await OrganizationProjectsPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({}),
        })
      )

      expect(mocks.projectsData).toHaveBeenCalledTimes(1)
      expect(mocks.projectsData).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_123',
          status: undefined,
        })
      )
    })

    it('threads a recognised status through to the list request', async () => {
      render(
        await OrganizationProjectsPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({ status: 'active' }),
        })
      )

      expect(mocks.projectsData).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    })

    it('drops an unrecognised status rather than forwarding it', async () => {
      render(
        await OrganizationProjectsPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({ status: 'not-a-status' }),
        })
      )

      expect(mocks.projectsData).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      )
    })

    it('stops before mounting the list when the organization does not resolve', async () => {
      mocks.resolveOrg.mockResolvedValue(null)

      await expect(
        OrganizationProjectsPage({
          params: Promise.resolve({ orgSlug: 'efesto' }),
          searchParams: Promise.resolve({}),
        })
      ).rejects.toThrow('not found')

      expect(mocks.notFound).toHaveBeenCalledTimes(1)
      expect(mocks.projectsData).not.toHaveBeenCalled()
    })
  })
})
