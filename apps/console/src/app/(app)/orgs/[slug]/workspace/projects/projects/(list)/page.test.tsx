// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Project } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/orgs/test-org/workspace/projects/projects',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projects: {
      list: mocks.listProjects,
    },
  },
}))

vi.mock('../../../../_data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

import OrganizationProjectsPage from './page'
import { ProjectsData } from '@/features/projects/components/projects-data'
import { isProjectStatus } from '@/features/projects/project-status'

const mockProjects: Project[] = [
  {
    object: 'projects.project',
    id: 'proj_1',
    tenantId: 'tenant_1',
    name: 'Apollo',
    key: 'APO',
    slug: 'apollo',
    description: 'Apollo mission',
    leadUserId: 'user_lead',
    status: 'active',
    health: 'on-track',
    startDate: 1700000000,
    targetDate: 1720000000,
    nextIssueNumber: 5,
    customerId: null,
    position: 1,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 4,
  },
]

afterEach(cleanup)

describe('OrganizationProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      slug: 'test-org',
      name: 'Test Org',
    })
    mocks.listProjects.mockResolvedValue({
      data: {
        object: 'list',
        data: mockProjects,
        hasMore: false,
        totalCount: 1,
      },
      error: null,
    })
  })

  it('renders toolbar and column headers while data is pending', async () => {
    const page = await OrganizationProjectsPage({
      params: Promise.resolve({ slug: 'test-org' }),
      searchParams: Promise.resolve({}),
    })

    const { container } = render(page)

    // Toolbar must be rendered
    expect(
      screen.getByRole('button', { name: /Filter projects by status/ })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/projects/new'
    )

    // Table header and columns must be present in the pending fallback
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Lead')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Target Date')).toBeInTheDocument()

    // Real table thead is present
    expect(container.querySelector('thead')).toBeInTheDocument()
  })

  it('threads the status filter into the client call', async () => {
    const statusParam = 'active'
    const status = isProjectStatus(statusParam) ? statusParam : 'all'

    const element = await ProjectsData({
      organizationId: 'org_123',
      base: '/orgs/test-org/workspace/projects',
      status,
    })

    render(element)

    expect(mocks.listProjects).toHaveBeenCalledTimes(1)
    expect(mocks.listProjects).toHaveBeenCalledWith('org_123', {
      status: 'active',
    })
    expect(screen.getByText('Apollo')).toBeInTheDocument()
  })

  it('resolves an unknown status to "all" and fetches without status filter', async () => {
    const statusParam = 'unknown_status_xyz'
    const status = isProjectStatus(statusParam) ? statusParam : 'all'
    expect(status).toBe('all')

    const element = await ProjectsData({
      organizationId: 'org_123',
      base: '/orgs/test-org/workspace/projects',
      status,
    })

    render(element)

    expect(mocks.listProjects).toHaveBeenCalledTimes(1)
    expect(mocks.listProjects).toHaveBeenCalledWith('org_123', {
      status: undefined,
    })
  })

  it('keeps toolbar mounted and renders an AppError notice when listing fails', async () => {
    mocks.listProjects.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/unavailable',
        message: 'Service temporarily down',
      },
    })

    const page = await OrganizationProjectsPage({
      params: Promise.resolve({ slug: 'test-org' }),
      searchParams: Promise.resolve({}),
    })

    // Toolbar remains mounted in page shell
    render(page)
    expect(screen.getByRole('link', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/projects/new'
    )

    // And ProjectsData renders AppError notice
    const dataElement = await ProjectsData({
      organizationId: 'org_123',
      base: '/orgs/test-org/workspace/projects',
      status: 'all',
    })

    render(dataElement)
    expect(
      screen.getByText('Some project data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Service temporarily down')).toBeInTheDocument()
  })
})
