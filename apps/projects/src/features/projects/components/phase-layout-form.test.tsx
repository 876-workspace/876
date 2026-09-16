// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Layout } from '@876/projects/layout-rules'
import type { MilestoneCustomField, Project } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createPhase: vi.fn(),
  updatePhase: vi.fn(),
  setPhaseFields: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  phasesClient: {
    create: mocks.createPhase,
    update: mocks.updatePhase,
    customFields: { set: mocks.setPhaseFields },
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { PhaseForm } from './phase-form'

const project: Project = {
  object: 'projects.project',
  id: 'project_1',
  tenantId: 'tenant_1',
  name: 'Console',
  key: 'CONSOLE',
  slug: 'console',
  description: null,
  leadUserId: null,
  status: 'active',
  health: 'on-track',
  startDate: null,
  targetDate: null,
  nextIssueNumber: 1,
  customerId: null,
  defaultWorkItemTypeId: null,
  position: 0,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
  memberCount: 1,
  customFields: [],
}

const regionField: MilestoneCustomField = {
  object: 'projects.milestone-custom-field',
  id: 'phase_field_1',
  tenantId: 'tenant_1',
  key: 'region',
  label: 'Region',
  fieldType: 'text',
  options: [],
  required: false,
  description: null,
  position: 0,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

const layout: Layout = {
  object: 'projects.layout',
  id: 'layout_phase',
  entity: 'phase',
  workItemTypeId: null,
  name: 'Default phase layout',
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
        { fieldKey: 'description', width: 1, visible: true },
        { fieldKey: 'cf:region', width: 1, visible: true },
      ],
    },
  ],
  rules: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createPhase.mockResolvedValue({ data: { id: 'phase_1' }, error: null })
  mocks.setPhaseFields.mockResolvedValue({ data: [], error: null })
})

describe('PhaseForm with a resolved layout', () => {
  it('renders fields through the resolved layout', () => {
    render(
      <PhaseForm
        mode="create"
        projects={[project]}
        members={[]}
        layout={layout}
        customFields={[regionField]}
      />
    )
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Region')).toBeInTheDocument()
  })

  it('maps named layout inputs to the create body', async () => {
    render(
      <PhaseForm
        mode="create"
        projects={[project]}
        members={[]}
        layout={layout}
        customFields={[regionField]}
      />
    )
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Launch readiness' },
    })
    fireEvent.change(screen.getByLabelText('Region'), {
      target: { value: 'EMEA' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create phase' }))

    await waitFor(() =>
      expect(mocks.createPhase).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Launch readiness', projectId: 'project_1' })
      )
    )
    await waitFor(() =>
      expect(mocks.setPhaseFields).toHaveBeenCalledWith('phase_1', [
        { fieldId: 'phase_field_1', value: 'EMEA' },
      ])
    )
    expect(mocks.push).toHaveBeenCalledWith('/phases/phase_1')
  })

  it('keeps entered values when the server reports rule errors', async () => {
    mocks.createPhase.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/layout-required-fields',
        message: 'The active layout requires additional fields.',
      },
    })
    render(
      <PhaseForm
        mode="create"
        projects={[project]}
        members={[]}
        layout={layout}
        customFields={[regionField]}
      />
    )
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Launch readiness' },
    })
    fireEvent.change(screen.getByLabelText('Region'), {
      target: { value: 'EMEA' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create phase' }))

    expect(await screen.findByText('Phase not saved')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Launch readiness')
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('requires a name before submitting', async () => {
    render(
      <PhaseForm
        mode="create"
        projects={[project]}
        members={[]}
        layout={layout}
        customFields={[regionField]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create phase' }))

    expect(await screen.findByText('Phase not saved')).toBeInTheDocument()
    expect(mocks.createPhase).not.toHaveBeenCalled()
  })
})
