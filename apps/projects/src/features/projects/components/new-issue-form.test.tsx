import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  CustomField,
  WorkItemType,
  WorkflowState,
} from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createIssue: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  issuesClient: { create: mocks.createIssue },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { NewIssueForm } from './new-issue-form'

const bugType: WorkItemType = {
  object: 'projects.work-item-type',
  id: 'type_bug',
  tenantId: 'tenant_1',
  key: 'bug',
  name: 'Bug',
  iconKey: 'bug',
  color: '#ef4444',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

const taskType: WorkItemType = {
  ...bugType,
  id: 'type_task',
  key: 'task',
  name: 'Task',
  iconKey: 'check-square',
  isDefault: false,
  position: 1,
}

const triageState: WorkflowState = {
  object: 'projects.workflow-state',
  id: 'state_1',
  tenantId: 'tenant_1',
  key: 'triage',
  name: 'Triage',
  category: 'backlog',
  color: '#6b7280',
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
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
  required: true,
  description: null,
  position: 0,
  typeIds: ['type_bug'],
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createIssue.mockResolvedValue({
    data: { identifier: 'PROJECT-1' },
    error: null,
  })
})

describe('NewIssueForm', () => {
  it('sends active defaults and omits unset optional values', async () => {
    render(
      <NewIssueForm
        workItemTypes={[bugType]}
        workflowStates={[triageState]}
        projects={[]}
        milestones={[]}
        customFields={[]}
      />
    )

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Ship the fix' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() =>
      expect(mocks.createIssue).toHaveBeenCalledWith({
        title: 'Ship the fix',
        projectId: undefined,
        description: null,
        typeKey: 'bug',
        status: 'triage',
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/issues/PROJECT-1')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('matches scoped custom fields against work item type ids', async () => {
    render(
      <NewIssueForm
        workItemTypes={[bugType, taskType]}
        workflowStates={[triageState]}
        projects={[]}
        milestones={[]}
        customFields={[environmentField]}
      />
    )

    expect(screen.getByLabelText('Environment')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'task' },
    })
    expect(screen.queryByLabelText('Environment')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'bug' },
    })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Production regression' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }))

    expect(await screen.findByText('Issue not created')).toBeInTheDocument()
    expect(mocks.createIssue).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Environment'), {
      target: { value: 'production' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() =>
      expect(mocks.createIssue).toHaveBeenCalledWith({
        title: 'Production regression',
        projectId: undefined,
        description: null,
        typeKey: 'bug',
        status: 'triage',
        customFields: [
          { fieldId: 'field_environment', value: 'production' },
        ],
      })
    )
  })
})
