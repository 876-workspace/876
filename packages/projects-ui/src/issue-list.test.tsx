// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Issue } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => mocks.segments,
}))

import { IssuesList } from './issue-list'

const sampleType = {
  object: 'projects.work-item-type' as const,
  id: 'wit_task_1',
  tenantId: 'tenant_1',
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

const mockIssues: Issue[] = [
  {
    object: 'projects.issue',
    id: 'issue_1',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'ALP',
    number: 12,
    identifier: 'ALP-12',
    title: 'Fix the auth race condition',
    description: 'Detailed description here',
    status: 'in-progress',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'high',
    assigneeUserId: 'user_42',
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: 3,
    dueDate: 1720000000,
    position: 1,
    labels: [
      {
        object: 'projects.label',
        id: 'lbl_1',
        tenantId: 'tenant_1',
        name: 'bug',
        color: '#ff0000',
        description: 'Bug reports',
        createdAt: 1700000000,
        updatedAt: 1700000000,
      },
    ],
    commentCount: 2,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700050000,
  },
  {
    object: 'projects.issue',
    id: 'issue_2',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'ALP',
    number: 13,
    identifier: 'ALP-13',
    title: 'Add dark mode support',
    description: 'Dark mode styles',
    status: 'done',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'low',
    assigneeUserId: 'user_43',
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: 1,
    dueDate: 1720000000,
    position: 2,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: 1700050000,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700050000,
  },
]

describe('IssuesList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  afterEach(cleanup)

  it('renders the full table when no record is open', () => {
    render(
      <IssuesList
        issues={mockIssues}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('ALP-12')).toBeInTheDocument()
    expect(screen.getAllByText('Fix the auth race condition')).toHaveLength(2)
    expect(screen.getByText('ALP-13')).toBeInTheDocument()
    expect(screen.getAllByText('Add dark mode support')).toHaveLength(2)
    expect(screen.queryByText('Issues')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'View issue ALP-12' })
    expect(link).toHaveAttribute('href', '/issues/ALP-12')
  })

  it('renders the desktop table and mobile rows together with one accessible issue link per table row', () => {
    const { container } = render(
      <IssuesList
        issues={mockIssues}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="list-row"]')).toHaveLength(2)

    const issueRow = screen.getByRole('row', {
      name: /ALP-12.*Fix the auth race condition/,
    })
    const titleCell = within(issueRow).getAllByRole('cell')[1]
    const titleLink = within(titleCell).getByRole('link', {
      name: 'View issue ALP-12',
    })

    expect(titleLink).toHaveAttribute('href', '/issues/ALP-12')
    expect(
      within(issueRow).getAllByRole('link', { name: 'View issue ALP-12' })
    ).toHaveLength(1)
  })

  it('renders the condensed pane when one is open', () => {
    mocks.segments = ['ALP-12']

    render(
      <IssuesList
        issues={mockIssues}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Issues')).toBeInTheDocument()
    expect(screen.getByText('ALP-12')).toBeInTheDocument()
    expect(screen.getByText('Fix the auth race condition')).toBeInTheDocument()
    expect(screen.getByText('ALP-13')).toBeInTheDocument()
    expect(screen.getByText('Add dark mode support')).toBeInTheDocument()
  })

  it('marks the open row selected by identifier and not id', () => {
    // When selected segment is the internal id 'issue_1', it should NOT mark row selected
    mocks.segments = ['issue_1']

    const { unmount } = render(
      <IssuesList
        issues={mockIssues}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    )

    const linkById = screen.getByRole('link', { name: 'View issue ALP-12' })
    expect(linkById).not.toHaveAttribute('aria-current')
    expect(linkById).not.toHaveAttribute('data-state')

    unmount()

    // When selected segment is the identifier 'ALP-12', it SHOULD mark row selected
    mocks.segments = ['ALP-12']

    render(
      <IssuesList
        issues={mockIssues}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    )

    const selectedLink = screen.getByRole('link', {
      name: 'View issue ALP-12',
    })
    const unselectedLink = screen.getByRole('link', {
      name: 'View issue ALP-13',
    })

    expect(selectedLink).toHaveAttribute('aria-current', 'true')
    expect(selectedLink).toHaveAttribute('data-state', 'selected')
    expect(unselectedLink).not.toHaveAttribute('aria-current')
    expect(unselectedLink).not.toHaveAttribute('data-state')
  })

  it('keeps the status badge in the condensed row', () => {
    mocks.segments = ['ALP-12']

    render(
      <IssuesList
        issues={mockIssues}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    )

    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('preserves the query string on condensed hrefs', () => {
    mocks.segments = ['ALP-12']
    mocks.searchParams = new URLSearchParams('sort=priority&tab=details')

    render(
      <IssuesList
        issues={mockIssues}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    )

    const link = screen.getByRole('link', { name: 'View issue ALP-12' })
    expect(link).toHaveAttribute(
      'href',
      '/issues/ALP-12?sort=priority&tab=details'
    )
  })

  it('renders the empty text with no rows', () => {
    mocks.segments = ['ALP-12']

    render(
      <IssuesList issues={[]} issuesHref="/issues" newIssueHref="/issues/new" />
    )

    expect(screen.getByText('No issues yet')).toBeInTheDocument()
  })
})
