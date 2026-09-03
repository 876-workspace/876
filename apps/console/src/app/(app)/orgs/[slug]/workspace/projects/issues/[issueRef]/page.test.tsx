// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Comment, Issue, IssueEvent } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  retrieveIssue: vi.fn(),
  listComments: vi.fn(),
  listEvents: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/orgs/test-org/workspace/projects/issues/APO-99',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    issues: {
      retrieve: mocks.retrieveIssue,
      events: {
        list: mocks.listEvents,
      },
    },
    comments: {
      list: mocks.listComments,
    },
  },
}))

vi.mock('../../../../_data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

import { IssueDetailData } from '@/features/projects/components/issue-detail-data'

const mockIssue: Issue = {
  object: 'projects.issue',
  id: 'issue_99',
  tenantId: 'tenant_1',
  projectId: 'proj_apollo',
  projectKey: 'APO',
  number: 99,
  identifier: 'APO-99',
  title: 'Oxygen pressure fluctuating in Module B',
  description:
    'Pressure drops below nominal thresholds during orbital sunrise.',
  status: 'in-progress',
  priority: 'urgent',
  assigneeUserId: 'user_flight_dir',
  creatorUserId: 'user_sensor_bot',
  parentIssueId: null,
  estimate: 5,
  dueDate: 1725000000,
  position: 1,
  labels: [
    {
      object: 'projects.label',
      id: 'lbl_lifesupport',
      tenantId: 'tenant_1',
      name: 'life-support',
      color: '#ef4444',
      description: 'Critical life support systems',
      createdAt: 1700000000,
      updatedAt: 1700000000,
    },
  ],
  commentCount: 1,
  subIssueCount: 0,
  startedAt: 1700000000,
  completedAt: null,
  canceledAt: null,
  createdAt: 1700000000,
  updatedAt: 1700010000,
}

const mockComments: Comment[] = [
  {
    object: 'projects.comment',
    id: 'comm_1',
    tenantId: 'tenant_1',
    issueId: 'issue_99',
    authorUserId: 'user_engineer',
    body: 'Re-routing secondary valving to stabilize manifold pressure.',
    createdAt: 1700005000,
    updatedAt: 1700005000,
  },
]

const mockEvents: IssueEvent[] = [
  {
    object: 'projects.issue-event',
    id: 'event_1',
    issueId: 'issue_99',
    actorUserId: 'user_flight_dir',
    type: 'status_changed',
    fromValue: 'todo',
    toValue: 'in-progress',
    createdAt: 1700002000,
  },
]

afterEach(cleanup)

describe('OrganizationIssueDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      slug: 'test-org',
      name: 'Test Org',
    })
    mocks.retrieveIssue.mockResolvedValue({
      data: mockIssue,
      error: null,
    })
    mocks.listComments.mockResolvedValue({
      data: {
        object: 'list',
        data: mockComments,
        hasMore: false,
        totalCount: 1,
      },
      error: null,
    })
    mocks.listEvents.mockResolvedValue({
      data: { object: 'list', data: mockEvents, hasMore: false, totalCount: 1 },
      error: null,
    })
  })

  it('renders issue detail keyed by identifier with description, comments, and activity', async () => {
    const element = await IssueDetailData({
      organizationId: 'org_123',
      base: '/orgs/test-org/workspace/projects',
      issueRef: 'APO-99',
    })

    render(element)

    expect(mocks.retrieveIssue).toHaveBeenCalledWith('org_123', 'APO-99')
    expect(mocks.listComments).toHaveBeenCalledWith('org_123', 'APO-99')
    expect(mocks.listEvents).toHaveBeenCalledWith('org_123', 'APO-99')

    expect(screen.getByText('APO-99')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Oxygen pressure fluctuating in Module B',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Pressure drops below nominal thresholds during orbital sunrise.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('life-support')).toBeInTheDocument()
    expect(screen.getAllByText('user_flight_dir')).toHaveLength(2)
    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()

    // Comments & activity
    expect(
      screen.getByText(
        'Re-routing secondary valving to stabilize manifold pressure.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('status_changed')).toBeInTheDocument()
  })

  it('renders AppError notice when issue retrieve fails', async () => {
    mocks.retrieveIssue.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/unavailable',
        message: 'Failed to retrieve issue',
      },
    })

    const element = await IssueDetailData({
      organizationId: 'org_123',
      base: '/orgs/test-org/workspace/projects',
      issueRef: 'APO-99',
    })

    render(element)

    expect(screen.getByText('Issue could not be loaded')).toBeInTheDocument()
    expect(screen.getByText('Failed to retrieve issue')).toBeInTheDocument()
  })
})
