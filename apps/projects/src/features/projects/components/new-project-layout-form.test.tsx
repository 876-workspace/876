// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Layout } from '@876/projects/layout-rules'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  setProjectValues: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  projectsClient: { create: mocks.createProject },
  projectCustomFieldsClient: { values: { set: mocks.setProjectValues } },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { NewProjectForm } from './new-project-form'

const layout: Layout = {
  object: 'projects.layout',
  id: 'layout_project',
  entity: 'project',
  workItemTypeId: null,
  name: 'Default project layout',
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
      ],
    },
  ],
  rules: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createProject.mockResolvedValue({ data: { id: 'project_1' }, error: null })
  mocks.setProjectValues.mockResolvedValue({ data: [], error: null })
})

describe('NewProjectForm with a resolved layout', () => {
  it('renders fields through the resolved layout', () => {
    render(<NewProjectForm layout={layout} customFields={[]} />)
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('maps named layout inputs to the create body', async () => {
    render(<NewProjectForm layout={layout} customFields={[]} />)
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Console Revamp' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(mocks.createProject).toHaveBeenCalledWith({
        name: 'Console Revamp',
        description: null,
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/projects/project_1')
  })

  it('keeps entered values when the create fails', async () => {
    mocks.createProject.mockResolvedValue({
      data: null,
      error: { code: 'projects/project-key-taken', message: 'Taken.' },
    })
    render(<NewProjectForm layout={layout} customFields={[]} />)
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Console Revamp' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Project not created')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Console Revamp')
  })
})
