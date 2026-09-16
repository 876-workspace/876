// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Layout } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  makeDefault: vi.fn(),
  deleteLayout: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  layoutsClient: {
    makeDefault: mocks.makeDefault,
    delete: mocks.deleteLayout,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mocks.refresh, back: vi.fn() }),
}))

import { LayoutsSettings } from './layouts-settings'

function buildLayout(overrides: Partial<Layout> = {}): Layout {
  return {
    object: 'projects.layout',
    id: 'layout_1',
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
        fields: [{ fieldKey: 'title', width: 1, visible: true }],
      },
    ],
    rules: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.makeDefault.mockResolvedValue({ data: buildLayout(), error: null })
  mocks.deleteLayout.mockResolvedValue({ data: { deleted: true }, error: null })
})

describe('LayoutsSettings', () => {
  it('groups layouts by entity', () => {
    render(
      <LayoutsSettings
        layouts={[
          buildLayout(),
          buildLayout({
            id: 'layout_2',
            entity: 'work-item',
            workItemTypeId: 'type_1',
            name: 'Bug layout',
            isDefault: false,
          }),
        ]}
        typeNames={{ type_1: 'Bug' }}
      />
    )
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Work items · Bug')).toBeInTheDocument()
    expect(screen.getByText('Bug layout')).toBeInTheDocument()
  })

  it('marks the default layout', () => {
    render(<LayoutsSettings layouts={[buildLayout()]} typeNames={{}} />)
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Make default' })
    ).not.toBeInTheDocument()
  })

  it('makes a layout default', async () => {
    render(
      <LayoutsSettings
        layouts={[buildLayout({ id: 'layout_2', isDefault: false, name: 'Alt' })]}
        typeNames={{}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Make default' }))

    await waitFor(() =>
      expect(mocks.makeDefault).toHaveBeenCalledWith('layout_2')
    )
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('links to the edit page', () => {
    render(<LayoutsSettings layouts={[buildLayout()]} typeNames={{}} />)
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/settings/layouts/layout_1/edit'
    )
  })

  it('removes a layout', async () => {
    render(<LayoutsSettings layouts={[buildLayout()]} typeNames={{}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(mocks.deleteLayout).toHaveBeenCalledWith('layout_1')
    )
  })

  it('shows an empty state without layouts', () => {
    render(<LayoutsSettings layouts={[]} typeNames={{}} />)
    expect(screen.getByText(/No layouts yet/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'New layout' })
    ).toHaveAttribute('href', '/settings/layouts/new')
  })
})
