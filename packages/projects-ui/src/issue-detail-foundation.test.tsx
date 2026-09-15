// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import type { CustomField, Issue, IssueEvent } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import { IssueDetail } from './issue-detail'

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    object: 'projects.issue',
    id: 'issue_2',
    tenantId: 'tenant_1',
    projectId: 'project_1',
    projectKey: 'WEB',
    number: 2,
    identifier: 'WEB-2',
    title: 'Review the release',
    description: 'Verify the **production** build.',
    status: 'ready-for-qa',
    typeKey: 'task',
    type: {
      object: 'projects.work-item-type',
      id: 'type_task',
      tenantId: 'tenant_1',
      key: 'task',
      name: 'Task',
      iconKey: 'check-square',
      color: '#3b82f6',
      hierarchyLevel: 1,
      description: null,
      isDefault: true,
      position: 0,
      archivedAt: null,
      createdAt: 1,
      updatedAt: 1,
    },
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
      position: 10,
      archivedAt: null,
      createdAt: 1,
      updatedAt: 1,
    },
    milestone: {
      object: 'projects.milestone',
      id: 'milestone_1',
      tenantId: 'tenant_1',
      projectId: 'project_1',
      key: 'M1',
      name: 'Release one',
      description: null,
      status: 'active',
      startDate: null,
      targetDate: null,
      completedAt: null,
      position: 0,
      createdAt: 1,
      updatedAt: 1,
    },
    customFields: [
      {
        object: 'projects.custom-field-value',
        id: 'value_environment',
        tenantId: 'tenant_1',
        issueId: 'issue_2',
        fieldId: 'field_environment',
        fieldKey: 'environment',
        fieldType: 'select',
        value: 'production',
        updatedBy: 'user_ana',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    priority: 'high',
    assigneeUserId: 'user_ana',
    creatorUserId: 'user_ben',
    parentIssueId: 'issue_1',
    estimate: 5,
    dueDate: 1704153600,
    position: 0,
    labels: [],
    commentCount: 1,
    subIssueCount: 1,
    startedAt: 1,
    completedAt: null,
    canceledAt: null,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  }
}

const customField: CustomField = {
  object: 'projects.custom-field',
  id: 'field_environment',
  tenantId: 'tenant_1',
  key: 'environment',
  label: 'Environment',
  fieldType: 'select',
  options: [{ key: 'production', label: 'Production' }],
  required: false,
  description: null,
  position: 0,
  typeIds: [],
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

const event: IssueEvent = {
  object: 'projects.issue-event',
  id: 'event_1',
  issueId: 'issue_2',
  actorUserId: 'user_ben',
  type: 'status_changed',
  fromValue: 'todo',
  toValue: 'ready-for-qa',
  createdAt: 2,
}

const parentIssue = makeIssue({
  id: 'issue_1',
  identifier: 'WEB-1',
  number: 1,
  title: 'Ship the release',
  parentIssueId: null,
  customFields: [],
  subIssueCount: 1,
})

describe('IssueDetail foundation fields', () => {
  it('surfaces configured work structure, hierarchy, custom fields and resolved identities', () => {
    render(
      <IssueDetail
        issue={makeIssue()}
        parentIssue={parentIssue}
        subIssues={[
          makeIssue({
            id: 'issue_3',
            identifier: 'WEB-3',
            number: 3,
            title: 'Run smoke tests',
            parentIssueId: 'issue_2',
            customFields: [],
            subIssueCount: 0,
          }),
        ]}
        customFields={[customField]}
        userLabels={{ user_ana: 'Ana Brown', user_ben: 'Ben Clarke' }}
        issuesHref="/issues"
        projectHref="/projects/project_1"
        editHref="/issues/WEB-2/edit"
      />
    )

    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText('Ready for QA')).toBeInTheDocument()
    expect(screen.getByText('Release one')).toBeInTheDocument()
    expect(screen.getByText('Environment')).toBeInTheDocument()
    expect(screen.getAllByText('production').length).toBeGreaterThan(0)
    expect(screen.getByText('Ana Brown')).toBeInTheDocument()
    expect(screen.getAllByText('Ben Clarke').length).toBeGreaterThan(0)
    expect(screen.getByText('Run smoke tests')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /WEB-1.*Ship the release/ })
    ).toHaveAttribute('href', '/issues/WEB-1')
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/issues/WEB-2/edit'
    )
  })

  it('resolves activity actors and formats event names', () => {
    render(
      <IssueDetail
        issue={makeIssue({ subIssueCount: 0 })}
        events={[event]}
        userLabels={{ user_ben: 'Ben Clarke' }}
      />
    )

    expect(screen.getAllByText('Ben Clarke').length).toBeGreaterThan(0)
    expect(screen.getByText('Status Changed')).toBeInTheDocument()
    expect(screen.getByText(/todo/)).toBeInTheDocument()
    expect(screen.getByText(/ready-for-qa/)).toBeInTheDocument()
  })
})
