import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { WorkItemType } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createWorkItemType: vi.fn(),
  deleteWorkItemType: vi.fn(),
  createWorkflowState: vi.fn(),
  deleteWorkflowState: vi.fn(),
  createMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
  createCustomField: vi.fn(),
  deleteCustomField: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('@/lib/client', () => ({
  workItemTypesClient: {
    create: mocks.createWorkItemType,
    delete: mocks.deleteWorkItemType,
  },
  workflowStatesClient: {
    create: mocks.createWorkflowState,
    delete: mocks.deleteWorkflowState,
  },
  milestonesClient: {
    create: mocks.createMilestone,
    delete: mocks.deleteMilestone,
  },
  customFieldsClient: {
    create: mocks.createCustomField,
    delete: mocks.deleteCustomField,
  },
}))

import { WorkStructureSettings } from './work-structure-settings'

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
  isDefault: false,
  position: 0,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const mock of [
    mocks.createWorkItemType,
    mocks.createWorkflowState,
    mocks.createMilestone,
    mocks.createCustomField,
  ]) {
    mock.mockResolvedValue({ data: { id: 'resource_1' }, error: null })
  }
})

describe('WorkStructureSettings', () => {
  it('renders an explicit empty state for work item types', () => {
    render(<WorkStructureSettings kind="work-item-types" items={[]} />)

    expect(screen.getByText('No work item types yet.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('renders a populated work item type with its key', () => {
    render(<WorkStructureSettings kind="work-item-types" items={[bugType]} />)

    expect(screen.getByText('Bug')).toBeVisible()
    expect(screen.getByText('bug')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled()
  })

  it('creates a text custom field without touching the field type selector', async () => {
    render(
      <WorkStructureSettings
        kind="custom-fields"
        items={[]}
        workItemTypes={[bugType]}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Customer URL' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(mocks.createCustomField).toHaveBeenCalledWith({
        key: 'customer-url',
        label: 'Customer URL',
        fieldType: 'text',
        required: false,
        typeIds: [],
      })
    )
  })

  it('creates select options and type bindings with durable keys', async () => {
    render(
      <WorkStructureSettings
        kind="custom-fields"
        items={[]}
        workItemTypes={[bugType]}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Environment' },
    })
    fireEvent.change(screen.getByLabelText('Field type'), {
      target: { value: 'select' },
    })
    fireEvent.change(screen.getByLabelText('Options'), {
      target: { value: 'Production\nQuality Assurance' },
    })
    fireEvent.click(screen.getByLabelText('Required'))
    fireEvent.click(screen.getByLabelText('Bug'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(mocks.createCustomField).toHaveBeenCalledWith({
        key: 'environment',
        label: 'Environment',
        fieldType: 'select',
        options: [
          { key: 'production', label: 'Production' },
          { key: 'quality-assurance', label: 'Quality Assurance' },
        ],
        required: true,
        typeIds: ['type_bug'],
      })
    )
  })

  it('rejects duplicate option keys before calling the client', async () => {
    render(
      <WorkStructureSettings
        kind="custom-fields"
        items={[]}
        workItemTypes={[]}
      />
    )

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Environment' },
    })
    fireEvent.change(screen.getByLabelText('Field type'), {
      target: { value: 'multi-select' },
    })
    fireEvent.change(screen.getByLabelText('Options'), {
      target: { value: 'Quality Assurance\nquality-assurance' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Settings not saved')).toBeVisible()
    expect(mocks.createCustomField).not.toHaveBeenCalled()
  })
})
