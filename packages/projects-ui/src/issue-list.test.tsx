import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Issue } from '@876/projects/contracts'

import { IssuesTable } from './issue-list'

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
]

describe('IssuesTable', () => {
  it('renders table columns and issue rows with identifier links', () => {
    render(
      <IssuesTable
        issues={mockIssues}
        issuesHref="/orgs/test-org/workspace/projects/issues"
      />
    )

    expect(screen.getByText('Identifier')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('ALP-12')).toBeInTheDocument()
    expect(screen.getByText('Fix the auth race condition')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('bug')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'View issue ALP-12' })
    expect(link).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/issues/ALP-12'
    )
  })

  it('renders empty state when there are no issues', () => {
    render(
      <IssuesTable
        issues={[]}
        issuesHref="/orgs/test-org/workspace/projects/issues"
        newIssueHref="/orgs/test-org/workspace/projects/issues/new"
      />
    )

    expect(screen.getByText('No issues yet')).toBeInTheDocument()
    const addLink = screen.getByRole('link', { name: /Add/ })
    expect(addLink).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/issues/new'
    )
  })
})
