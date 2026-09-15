// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import type { Issue } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import { IssueBoard } from './issue-board'

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    object: 'projects.issue',
    id: 'issue_1',
    tenantId: 'tenant_1',
    projectId: 'project_1',
    projectKey: 'WEB',
    number: 1,
    identifier: 'WEB-1',
    title: 'Review the release',
    description: null,
    status: 'ready-for-qa',
    typeKey: 'task',
    type: null,
    state: {
      object: 'projects.workflow-state',
      id: 'state_qa',
      tenantId: 'tenant_1',
      key: 'ready-for-qa',
      name: 'Ready for QA',
      category: 'started',
      color: '#7c3aed',
      description: null,
      isDefault: false,
      position: 20,
      archivedAt: null,
      createdAt: 1,
      updatedAt: 1,
    },
    milestone: null,
    customFields: [],
    priority: 'high',
    assigneeUserId: 'user_ana',
    creatorUserId: 'user_ben',
    parentIssueId: null,
    estimate: 3,
    dueDate: null,
    position: 0,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: 1,
    completedAt: null,
    canceledAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('IssueBoard grouping', () => {
  it('adds tenant-defined workflow states instead of dropping their issues', () => {
    render(<IssueBoard issues={[makeIssue()]} issuesHref="/issues" />)

    const customColumn = screen.getByRole('heading', { name: 'Ready for QA' })
      .parentElement?.parentElement

    expect(customColumn).not.toBeNull()
    expect(within(customColumn as HTMLElement).getByText('Review the release')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Backlog' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
  })

  it('groups the board by assignee using resolved member labels', () => {
    render(
      <IssueBoard
        issues={[makeIssue()]}
        issuesHref="/issues"
        groupBy="assignee"
        userLabels={{ user_ana: 'Ana Brown' }}
      />
    )

    const heading = screen.getByRole('heading', { name: 'Ana Brown' })
    const group = heading.parentElement?.parentElement

    expect(group).not.toBeNull()
    expect(within(group as HTMLElement).getByText('Review the release')).toBeInTheDocument()
  })
})
