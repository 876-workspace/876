import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Issue } from '@876/projects/contracts'

import { IssueBoard } from './issue-board'

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
    number: 1,
    identifier: 'ALP-1',
    title: 'Backlog item',
    description: null,
    status: 'backlog',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'low',
    assigneeUserId: null,
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    position: 1,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
  {
    object: 'projects.issue',
    id: 'issue_2',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'ALP',
    number: 2,
    identifier: 'ALP-2',
    title: 'In progress item',
    description: null,
    status: 'in-progress',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'urgent',
    assigneeUserId: 'user_dev',
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: 5,
    dueDate: null,
    position: 2,
    labels: [],
    commentCount: 1,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
]

describe('IssueBoard', () => {
  it('renders all 6 status columns and places issues in the correct columns', () => {
    render(
      <IssueBoard
        issues={mockIssues}
        issuesHref="/orgs/test-org/workspace/projects/issues"
      />
    )

    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('In Review')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Canceled')).toBeInTheDocument()

    expect(screen.getByText('ALP-1')).toBeInTheDocument()
    expect(screen.getByText('Backlog item')).toBeInTheDocument()
    expect(screen.getByText('ALP-2')).toBeInTheDocument()
    expect(screen.getByText('In progress item')).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()
  })
})
