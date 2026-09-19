/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import type { Issue } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  listIssues: vi.fn(),
  listEvents: vi.fn(),
  listFields: vi.fn(),
  memberLabels: vi.fn(),
  listStates: vi.fn(),
  linksData: vi.fn(),
  listFollowers: vi.fn(),
  getIssueVisibility: vi.fn(),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    issues: {
      retrieve: mocks.retrieve,
      list: mocks.listIssues,
      events: { list: mocks.listEvents },
    },
    customFields: { list: mocks.listFields },
    workflowStates: { list: mocks.listStates },
    followers: { list: mocks.listFollowers },
  },
}))
vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.memberLabels,
}))
vi.mock('@/lib/visibility', () => ({
  getIssueVisibility: mocks.getIssueVisibility,
}))
vi.mock('@/features/projects/components/issue-links-data', () => ({
  IssueLinksData: (props: Record<string, unknown>) => {
    mocks.linksData(props)
    return <div>Links panel</div>
  },
}))
vi.mock('@/features/projects/components/issue-comments-loader', () => ({
  IssueCommentsLoader: () => <div>Comment thread</div>,
}))
vi.mock('@/features/projects/components/attachments-data', () => ({
  AttachmentsData: () => <div>Attachments panel</div>,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { IssueDetailData } from './issue-detail-data'

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    object: 'projects.issue',
    id: 'iss_2',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    projectKey: 'CONSOLE',
    number: 2,
    identifier: 'CONSOLE-2',
    title: 'Verify the release',
    description: 'Check the production build.',
    status: 'todo',
    typeKey: 'task',
    type: null,
    state: null,
    milestone: null,
    taskListId: null,
    cycleId: null,
    customFields: [],
    priority: 'none',
    assigneeUserId: null,
    creatorUserId: null,
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
    position: 0,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

async function renderDetail(issue: Issue) {
  mocks.retrieve.mockResolvedValue({ data: issue, error: null })
  return render(
    await IssueDetailData({
      orgId: 'org_1',
      userId: 'usr_1',
      canEdit: true,
      canToggleVisibility: false,
      issueRef: 'CONSOLE-2',
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listIssues.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.listEvents.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.listFields.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.memberLabels.mockResolvedValue({ labels: {} })
  mocks.listStates.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.listFollowers.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.getIssueVisibility.mockResolvedValue(null)
})

describe('IssueDetailData', () => {
  it('shows the Blocked badge when the work item is blocked', async () => {
    await renderDetail(makeIssue({ blocked: true }))

    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('leaves the Blocked badge off when the work item is not blocked', async () => {
    await renderDetail(makeIssue({ blocked: false }))

    expect(screen.queryByText('Blocked')).not.toBeInTheDocument()
  })

  it('mounts the relationships and dependencies panel for the work item', async () => {
    await renderDetail(makeIssue())

    expect(screen.getByText('Links panel')).toBeInTheDocument()
    expect(mocks.linksData).toHaveBeenCalledWith({
      orgId: 'org_1',
      issueRef: 'CONSOLE-2',
    })
  })

  it('keeps the comment thread alongside the links panel', async () => {
    await renderDetail(makeIssue({ commentCount: 3 }))

    expect(screen.getByText('Links panel')).toBeInTheDocument()
    expect(screen.getByText('Comment thread')).toBeInTheDocument()
  })
})
