// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Layout } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createLayout: vi.fn(),
  updateLayout: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  layoutsClient: { create: mocks.createLayout, update: mocks.updateLayout },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh,
    back: mocks.back,
  }),
}))

import { LayoutForm } from './layout-form'

const layout: Layout = {
  object: 'projects.layout',
  id: null,
  entity: 'project',
  workItemTypeId: null,
  name: '',
  version: 1,
  isDefault: false,
  builtIn: false,
  sections: [
    {
      key: 'section-1',
      title: 'Details',
      columns: 1,
      fields: [{ fieldKey: 'title', width: 1, visible: true }],
    },
  ],
  rules: [],
}

const availableByEntity = {
  project: [
    { fieldKey: 'title', label: 'Title' },
    { fieldKey: 'description', label: 'Description' },
  ],
  phase: [{ fieldKey: 'title', label: 'Title' }],
  'work-item': [{ fieldKey: 'title', label: 'Title' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createLayout.mockResolvedValue({ data: { id: 'layout_1' }, error: null })
  mocks.updateLayout.mockResolvedValue({ data: { id: 'layout_1' }, error: null })
})

describe('LayoutForm', () => {
  it('creates a layout with the editor definition', async () => {
    render(
      <LayoutForm
        mode="create"
        layout={layout}
        workItemTypes={[]}
        availableByEntity={availableByEntity}
      />
    )
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Default project layout' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create layout' }))

    await waitFor(() =>
      expect(mocks.createLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'project',
          name: 'Default project layout',
          definition: expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({ key: 'section-1' }),
            ]),
          }),
        })
      )
    )
    expect(mocks.push).toHaveBeenCalledWith('/settings/layouts')
  })

  it('updates a layout name', async () => {
    render(
      <LayoutForm
        mode="edit"
        layout={{ ...layout, id: 'layout_1', name: 'Old name' }}
        workItemTypes={[]}
        availableByEntity={availableByEntity}
      />
    )
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'New name' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mocks.updateLayout).toHaveBeenCalledWith(
        'layout_1',
        expect.objectContaining({ name: 'New name' })
      )
    )
  })

  it('surfaces service errors without navigating', async () => {
    mocks.createLayout.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    render(
      <LayoutForm
        mode="create"
        layout={layout}
        workItemTypes={[]}
        availableByEntity={availableByEntity}
      />
    )
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Default project layout' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create layout' }))

    expect(await screen.findByText('Layout not created')).toBeInTheDocument()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
