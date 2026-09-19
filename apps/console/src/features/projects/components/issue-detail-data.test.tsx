// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeComment,
  makeDependency,
  makeIssue,
  makeIssueEvent,
  makeRelation,
  makeTimeEntry,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveIssue: vi.fn(),
  listComments: vi.fn(),
  listEvents: vi.fn(),
  listRelations: vi.fn(),
  listDependencies: vi.fn(),
  listTimeEntries: vi.fn(),
  listLinks: vi.fn(),
  retrieveFile: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/issues/FAL-1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    issues: {
      retrieve: mocks.retrieveIssue,
      events: { list: mocks.listEvents },
    },
    comments: {
      list: mocks.listComments,
    },
    issueRelations: {
      list: mocks.listRelations,
    },
    issueDependencies: {
      list: mocks.listDependencies,
    },
    timeEntries: {
      list: mocks.listTimeEntries,
    },
  },
}))

vi.mock('./attachments-data', () => ({
  AttachmentsData: () => <div data-testid="issue-attachments" />,
}))

vi.mock('@/lib/clients/storage', () => ({
  storage: {
    resourceLinks: {
      list: mocks.listLinks,
    },
    files: {
      retrieve: mocks.retrieveFile,
    },
  },
}))

import { IssueDetailData } from './issue-detail-data'

afterEach(cleanup)

describe('IssueDetailData oversight sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveIssue.mockResolvedValue({
      data: makeIssue(),
      error: null,
    })
    mocks.listComments.mockResolvedValue({
      data: listOf([makeComment()]),
      error: null,
    })
    mocks.listEvents.mockResolvedValue({
      data: listOf([makeIssueEvent()]),
      error: null,
    })
    mocks.listRelations.mockResolvedValue({
      data: listOf([makeRelation()]),
      error: null,
    })
    mocks.listDependencies.mockResolvedValue({
      data: {
        predecessors: [makeDependency()],
        successors: [],
      },
      error: null,
    })
    mocks.listTimeEntries.mockResolvedValue({
      data: listOf([makeTimeEntry()]),
      error: null,
    })
    mocks.listLinks.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })
  })

  it('renders relations, dependencies, time logged, and attachments', async () => {
    render(
      await IssueDetailData({
        organizationId: 'org_1',
        base: '/projects',
        issueRef: 'FAL-1',
        actorUserId: null,
      })
    )

    expect(mocks.listRelations).toHaveBeenCalledWith('org_1', 'FAL-1')
    expect(mocks.listDependencies).toHaveBeenCalledWith('org_1', 'FAL-1')
    expect(mocks.listTimeEntries).toHaveBeenCalledWith('org_1', {
      issueId: 'issue_1',
    })
    expect(screen.getByText('Relations (1)')).toBeInTheDocument()
    expect(screen.getByText('relates-to')).toBeInTheDocument()
    expect(screen.getByText('issue_2')).toBeInTheDocument()
    expect(screen.getByText('Blocked by (1)')).toBeInTheDocument()
    expect(screen.getByText('issue_0')).toBeInTheDocument()
    expect(screen.getByText(/Time logged · 1h across 1 entry/)).toBeInTheDocument()
    expect(screen.getByTestId('issue-attachments')).toBeInTheDocument()
  })

  it('renders empty states when the work item has no extras', async () => {
    mocks.listRelations.mockResolvedValue({
      data: listOf([]),
      error: null,
    })
    mocks.listDependencies.mockResolvedValue({
      data: { predecessors: [], successors: [] },
      error: null,
    })
    mocks.listTimeEntries.mockResolvedValue({
      data: listOf([]),
      error: null,
    })

    render(
      await IssueDetailData({
        organizationId: 'org_1',
        base: '/projects',
        issueRef: 'FAL-1',
        actorUserId: null,
      })
    )

    expect(
      screen.getByText('This work item has no relations.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('This work item has no dependencies.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('No time has been logged against this work item yet.')
    ).toBeInTheDocument()
  })

  it('keeps the record and banners enrichment failures', async () => {
    mocks.listRelations.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await IssueDetailData({
        organizationId: 'org_1',
        base: '/projects',
        issueRef: 'FAL-1',
        actorUserId: null,
      })
    )

    expect(
      screen.getByText('Some issue details could not be loaded')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Merlin engine checkout' })
    ).toBeInTheDocument()
  })

  it('renders AppError when the issue cannot be loaded', async () => {
    mocks.retrieveIssue.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await IssueDetailData({
        organizationId: 'org_1',
        base: '/projects',
        issueRef: 'FAL-1',
        actorUserId: null,
      })
    )

    expect(screen.getByText('Issue could not be loaded')).toBeInTheDocument()
  })
})
