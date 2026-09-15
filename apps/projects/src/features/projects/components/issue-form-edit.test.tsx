// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  CustomField,
  Issue,
  Label,
  Milestone,
  Project,
  WorkItemType,
  WorkflowState,
} from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  issuesClient: {
    create: mocks.createIssue,
    update: mocks.updateIssue,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { EditIssueForm } from './issue-form'

const workItemType: WorkItemType = {
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
}

const workflowState: WorkflowState = {
  object: 'projects.workflow-state',
  id: 'state_ready',
  tenantId: 'tenant_1',
  key: 'ready-for-qa',
  name: 'Ready for QA',
  category: 'started',
  color: '#64748b',
  description: null,
  isDefault: true,
  position: 1,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

const project: Project = {
  object: 'projects.project',
  id: 'project_1',
  tenantId: 'tenant_1',
  name: 'Console',
  key: 'CONSOLE',
  slug: 'console',
  description: null,
  leadUserId: 'user_1',
  status: 'active',
  health: 'on-track',
  startDate: null,
  targetDate: null,
  nextIssueNumber: 3,
  customerId: null,
  defaultWorkItemTypeId: workItemType.id,
  position: 0,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
  memberCount: 2,
}

const milestone: Milestone = {
  object: 'projects.milestone',
  id: 'milestone_1',
  tenantId: 'tenant_1',
  projectId: project.id,
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
}

const label: Label = {
  object: 'projects.label',
  id: 'label_bug',
  tenantId: 'tenant_1',
  name: 'Bug',
  color: '#ef4444',
  description: null,
  createdAt: 1,
  updatedAt: 1,
}

const environmentField: CustomField = {
  object: 'projects.custom-field',
  id: 'field_environment',
  tenantId: 'tenant_1',
  key: 'environment',
  label: 'Environment',
  fieldType: 'select',
  options: [
    { key: 'production', label: 'Production' },
    { key: 'staging', label: 'Staging' },
  ],
  required: false,
  description: null,
  position: 0,
  typeIds: [workItemType.id],
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    object: 'projects.issue',
    id: 'issue_2',
    tenantId: 'tenant_1',
    projectId: project.id,
    projectKey: project.key,
    number: 2,
    identifier: 'CONSOLE-2',
    title: 'Verify the release',
    description: 'Check the production build.',
    status: workflowState.key,
    typeKey: workItemType.key,
    type: workItemType,
    state: workflowState,
    milestone,
    customFields: [
      {
        object: 'projects.custom-field-value',
        id: 'value_environment',
        tenantId: 'tenant_1',
        issueId: 'issue_2',
        fieldId: environmentField.id,
        fieldKey: environmentField.key,
        fieldType: environmentField.fieldType,
        value: 'production',
        updatedBy: 'user_1',
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
    position: 1,
    labels: [label],
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

const parentIssue = makeIssue({
  id: 'issue_1',
  number: 1,
  identifier: 'CONSOLE-1',
  title: 'Ship the release',
  parentIssueId: null,
  customFields: [],
  labels: [],
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateIssue.mockResolvedValue({ data: makeIssue(), error: null })
})

describe('EditIssueForm', () => {
  it('initializes the complete editable issue state', () => {
    render(
      <EditIssueForm
        issue={makeIssue()}
        workItemTypes={[workItemType]}
        workflowStates={[workflowState]}
        projects={[project]}
        milestones={[milestone]}
        customFields={[environmentField]}
        labels={[label]}
        issues={[parentIssue, makeIssue()]}
        members={[
          { userId: 'user_ana', label: 'Ana Brown' },
          { userId: 'user_ben', label: 'Ben Clarke' },
        ]}
      />
    )

    expect(screen.getByLabelText('Title')).toHaveValue('Verify the release')
    expect(screen.getByLabelText('Project')).toHaveValue(project.id)
    expect(screen.getByLabelText('Type')).toHaveValue(workItemType.key)
    expect(screen.getByLabelText('Status')).toHaveValue(workflowState.key)
    expect(screen.getByLabelText('Phase')).toHaveValue(milestone.id)
    expect(screen.getByLabelText('Priority')).toHaveValue('high')
    expect(screen.getByLabelText('Assignee')).toHaveValue('user_ana')
    expect(screen.getByLabelText('Parent')).toHaveValue(parentIssue.id)
    expect(screen.getByLabelText('Estimate')).toHaveValue(5)
    expect(screen.getByLabelText('Due date')).toHaveValue('2024-01-02')
    expect(screen.getByLabelText('Environment')).toHaveValue('production')
    expect(screen.getByLabelText('Bug')).toBeChecked()
  })

  it('submits canonical update fields and returns to the issue detail', async () => {
    render(
      <EditIssueForm
        issue={makeIssue()}
        workItemTypes={[workItemType]}
        workflowStates={[workflowState]}
        projects={[project]}
        milestones={[milestone]}
        customFields={[environmentField]}
        labels={[label]}
        issues={[parentIssue, makeIssue()]}
        members={[{ userId: 'user_ana', label: 'Ana Brown' }]}
      />
    )

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Verify the release candidate' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mocks.updateIssue).toHaveBeenCalledWith('CONSOLE-2', {
        title: 'Verify the release candidate',
        projectId: project.id,
        description: 'Check the production build.',
        typeKey: workItemType.key,
        status: workflowState.key,
        milestoneId: milestone.id,
        priority: 'high',
        assigneeUserId: 'user_ana',
        parentIssueId: parentIssue.id,
        estimate: 5,
        dueDate: 1704153600,
        labelIds: [label.id],
        customFields: [{ fieldId: environmentField.id, value: 'production' }],
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/issues/CONSOLE-2')
    expect(mocks.refresh).toHaveBeenCalled()
  })
})
