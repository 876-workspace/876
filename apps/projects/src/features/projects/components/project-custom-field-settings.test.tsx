// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ProjectCustomField } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createField: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  projectCustomFieldsClient: {
    create: mocks.createField,
    update: mocks.updateField,
    delete: mocks.deleteField,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { ProjectCustomFieldSettings } from './project-custom-field-settings'

const field: ProjectCustomField = {
  object: 'projects.project-custom-field',
  id: 'field_1',
  tenantId: 'tenant_1',
  key: 'business-unit',
  label: 'Business unit',
  fieldType: 'text',
  options: [],
  required: false,
  description: null,
  position: 0,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createField.mockResolvedValue({ data: field, error: null })
  mocks.updateField.mockResolvedValue({ data: field, error: null })
  mocks.deleteField.mockResolvedValue({ data: { deleted: true }, error: null })
})

describe('ProjectCustomFieldSettings', () => {
  it('lists existing project fields', () => {
    render(<ProjectCustomFieldSettings fields={[field]} />)
    expect(screen.getByText('Business unit')).toBeInTheDocument()
    expect(screen.getByText(/business-unit/)).toBeInTheDocument()
  })

  it('shows an empty state without fields', () => {
    render(<ProjectCustomFieldSettings fields={[]} />)
    expect(screen.getByText('No Project custom fields yet.')).toBeInTheDocument()
  })

  it('creates a field from the form', async () => {
    render(<ProjectCustomFieldSettings fields={[]} />)
    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'Business unit' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(mocks.createField).toHaveBeenCalledWith({
        key: 'business-unit',
        label: 'Business unit',
        fieldType: 'text',
        required: false,
        description: null,
      })
    )
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('edits a field label inline', async () => {
    render(<ProjectCustomFieldSettings fields={[field]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const labels = screen.getAllByLabelText('Label')
    fireEvent.change(labels[labels.length - 1], {
      target: { value: 'Business Unit' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.updateField).toHaveBeenCalledWith('field_1', {
        label: 'Business Unit',
        required: false,
      })
    )
  })

  it('removes a field', async () => {
    render(<ProjectCustomFieldSettings fields={[field]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(mocks.deleteField).toHaveBeenCalledWith('field_1')
    )
  })

  it('surfaces service errors without clearing the form', async () => {
    mocks.createField.mockResolvedValue({
      data: null,
      error: { code: 'projects/custom-field-key-taken', message: 'Taken.' },
    })
    render(<ProjectCustomFieldSettings fields={[]} />)
    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'Business unit' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Project fields not saved')).toBeInTheDocument()
    expect(screen.getByLabelText('Label')).toHaveValue('Business unit')
  })
})
