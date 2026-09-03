// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Issue } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  listIssues: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/orgs/test-org/workspace/projects/issues',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    issues: {
      list: mocks.listIssues,
    },
  },
}))

vi.mock('../../../../_data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

import OrganizationIssuesPage from './page'
import { IssuesData } from '@/features/projects/components/issues-data'
import { isIssueStatus } from '@/features/projects/issue-status'

const mockIssues: Issue[] = [
  {
    object: 'projects.issue',
    id: 'issue_1',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'APO',
    number: 42,
    identifier: 'APO-42',
    title: 'Lunar lander telemetry drift',
    description: 'Drift detected in sensor 3',
    status: 'in-progress',
    priority: 'urgent',
    assigneeUserId: 'user_pilot',
    creatorUserId: 'user_lead',
    parentIssueId: null,
    estimate: 8,
    dueDate: null,
    position: 1,
    labels: [],
    commentCount: 3,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
]

afterEach(cleanup)

describe('OrganizationIssuesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      slug: 'test-org',
      name: 'Test Org',
    })
    mocks.listIssues.mockResolvedValue({
      data: { object: 'list', data: mockIssues, hasMore: false, totalCount: 1 },
      error: null,
    })
  })

  it('renders toolbar and column headers while data is pending', async () => {
    const page = await OrganizationIssuesPage({
      params: Promise.resolve({ slug: 'test-org' }),
      searchParams: Promise.resolve({}),
    })

    const { container } = render(page)

    // Toolbar must be rendered
    expect(screen.getByRole('button', { name: /Filter issues by status/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/issues/new'
    )

    // Table header and columns must be present in the pending fallback
    expect(screen.getByText('Identifier')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Assignee')).toBeInTheDocument()
    expect(screen.getByText('Updated')).toBeInTheDocument()

    // Real table thead is present
    expect(container.querySelector('thead')).toBeInTheDocument()
  })

  it('threads the status filter into the client call', async () => {
    const statusParam = 'in-progress'
    const status = isIssueStatus(statusParam) ? statusParam : 'all'

    const element = await IssuesData({
      slug: 'test-org',
      status,
    })

    render(element)

    expect(mocks.listIssues).toHaveBeenCalledTimes(1)
    expect(mocks.listIssues).toHaveBeenCalledWith('org_123', {
      status: 'in-progress',
    })
    expect(screen.getByText('APO-42')).toBeInTheDocument()
    expect(screen.getByText('Lunar lander telemetry drift')).toBeInTheDocument()
  })

  it('resolves an unknown status to "all" and fetches without status filter', async () => {
    const statusParam = 'invalid_lifecycle_status'
    const status = isIssueStatus(statusParam) ? statusParam : 'all'
    expect(status).toBe('all')

    const element = await IssuesData({
      slug: 'test-org',
      status,
    })

    render(element)

    expect(mocks.listIssues).toHaveBeenCalledTimes(1)
    expect(mocks.listIssues).toHaveBeenCalledWith('org_123', {
      status: undefined,
    })
  })

  it('keeps toolbar mounted and renders an AppError notice when listing fails', async () => {
    mocks.listIssues.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Issue database unavailable' },
    })

    const page = await OrganizationIssuesPage({
      params: Promise.resolve({ slug: 'test-org' }),
      searchParams: Promise.resolve({}),
    })

    render(page)
    expect(screen.getByRole('link', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/issues/new'
    )

    const dataElement = await IssuesData({
      slug: 'test-org',
      status: 'all',
    })

    render(dataElement)
    expect(
      screen.getByText('Some issue data could not be loaded')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Issue database unavailable')
    ).toBeInTheDocument()
  })
})
