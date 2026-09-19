// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeLayout } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listLayouts: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/layouts',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    layouts: {
      list: mocks.listLayouts,
    },
  },
}))

import { LayoutsData } from './layouts-data'

afterEach(cleanup)

describe('LayoutsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listLayouts.mockResolvedValue({
      data: listOf([makeLayout()]),
      error: null,
    })
  })

  it('fetches layouts for the host organization', async () => {
    render(await LayoutsData({ organizationId: 'org_1', base: '/projects' }))

    expect(mocks.listLayouts).toHaveBeenCalledWith('org_1')
  })

  it('renders layout names with entity, type, and version', async () => {
    mocks.listLayouts.mockResolvedValue({
      data: listOf([
        makeLayout({ workItemTypeId: 'wit_task_1', isDefault: false }),
      ]),
      error: null,
    })

    render(await LayoutsData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getAllByText('Project default')).toHaveLength(2)
    expect(screen.getByText('project')).toBeInTheDocument()
    expect(screen.getByText('wit_task_1')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="badge"]')).toBeNull()
  })

  it('marks the default layout', async () => {
    render(await LayoutsData({ organizationId: 'org_1', base: '/projects' }))

    expect(document.querySelector('[data-slot="badge"]')).toHaveTextContent(
      'Default'
    )
  })

  it('links each row under the host layouts root', async () => {
    render(
      await LayoutsData({
        organizationId: 'org_1',
        base: '/workspace/acme/projects',
      })
    )

    expect(
      screen.getByRole('link', { name: 'Project default' })
    ).toHaveAttribute('href', '/workspace/acme/projects/layouts/lay_test')
  })

  it('renders built-in layouts without a link', async () => {
    mocks.listLayouts.mockResolvedValue({
      data: listOf([makeLayout({ id: null, name: 'Built-in project' })]),
      error: null,
    })

    render(await LayoutsData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getAllByText('Built-in project')).toHaveLength(2)
    expect(
      screen.queryByRole('link', { name: 'Built-in project' })
    ).toBeNull()
  })

  it('shows the shared empty state when no layouts exist', async () => {
    mocks.listLayouts.mockResolvedValue({ data: listOf([]), error: null })

    render(await LayoutsData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getAllByText('No layouts yet')).toHaveLength(2)
  })

  it('keeps the list shell and shows a banner when loading fails', async () => {
    mocks.listLayouts.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await LayoutsData({ organizationId: 'org_1', base: '/projects' }))

    expect(
      screen.getByText('Layout data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getAllByText('No layouts yet')).toHaveLength(2)
  })
})
