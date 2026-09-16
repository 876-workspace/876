// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Layout } from '@876/projects/layout-rules'
import type { CustomField, WorkItemType, WorkflowState } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  issuesClient: { create: mocks.createIssue, update: mocks.updateIssue },
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
  required: false,
  description: null,
  position: 0,
  typeIds: [],
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

const layout: Layout = {
  object: 'projects.layout',
  id: 'layout_1',
  entity: 'work-item',
  workItemTypeId: null,
  name: 'Default',
  version: 1,
  isDefault: true,
  builtIn: false,
  sections: [
    {
      key: 'section-1',
      title: 'Details',
      columns: 1,
      fields: [
        { fieldKey: 'title', width: 1, visible: true },
        { fieldKey: 'state', width: 1, visible: true },
        { fieldKey: 'cf:environment', width: 1, visible: true },
      ],
    },
  ],
  rules: [
    {
      key: 'rule-1',
      when: [{ fieldKey: 'state', op: 'equals', value: 'triage' }],
      then: [{ fieldKey: 'cf:environment', effect: 'require' }],
    },
  ],
}

function renderForm() {
  return render(
    <NewIssueForm
      workItemTypes={[bugType]}
      workflowStates={[triageState]}
      projects={[]}
      milestones={[]}
      customFields={[environmentField]}
      layout={layout}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createIssue.mockResolvedValue({
    data: { identifier: 'PROJECT-1' },
    error: null,
  })
})

describe('NewIssueForm with a resolved layout', () => {
  it('renders fields through the resolved layout', () => {
    renderForm()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Environment')).toBeInTheDocument()
  })

  it('maps named layout inputs to the create body', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Production regression' },
    })
    fireEvent.change(screen.getByLabelText('Environment'), {
      target: { value: 'production' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }))

    await waitFor(() =>
      expect(mocks.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Production regression',
          customFields: [
            { fieldId: 'field_environment', value: 'production' },
          ],
        })
      )
    )
    expect(mocks.push).toHaveBeenCalledWith('/issues/PROJECT-1')
  })

  it('lists missing layout fields while keeping entered values', async () => {
    const { container } = renderForm()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Production regression' },
    })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    expect(await screen.findByText('Issue not created')).toBeInTheDocument()
    expect(screen.getByLabelText('Fields to complete')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Production regression')
    expect(mocks.createIssue).not.toHaveBeenCalled()
  })

  it('renders server rule errors with the field list', async () => {
    mocks.createIssue.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/layout-required-fields',
        message: 'The active layout requires additional fields.',
      },
    })
    renderForm()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Production regression' },
    })
    fireEvent.change(screen.getByLabelText('Environment'), {
      target: { value: 'production' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create issue' }))

    expect(await screen.findByText('Issue not created')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Production regression')
  })
})
