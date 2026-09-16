import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ list: vi.fn() }))

vi.mock('@/lib/services/projects', () => ({
  projects: { projectTemplates: { list: mocks.list } },
}))

const { TemplatesData } = await import('./templates-data')

const TEMPLATE = {
  object: 'projects.project-template',
  id: 'tpl_1',
  key: 'agile-sprint',
  name: 'Agile sprint',
  description: 'Two-week delivery cadence',
  currentVersion: 2,
  sourceProjectId: null,
  counts: { phases: 4, taskLists: 2, workItems: 12, dependencies: 3 },
  createdAt: 1788220800,
  updatedAt: 1788220800,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue({
    data: { object: 'list', data: [TEMPLATE] },
    error: null,
  })
})

describe('TemplatesData', () => {
  it('lists the templates with their keys and versions', async () => {
    render(await TemplatesData({ orgId: 'org_1' }))

    // The name renders twice: once per layout (mobile list, desktop table).
    expect(screen.getAllByText('Agile sprint')).toHaveLength(2)
    expect(screen.getByText('agile-sprint')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
  })

  it('names the empty list', async () => {
    mocks.list.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })

    render(await TemplatesData({ orgId: 'org_1' }))

    expect(screen.getAllByText('No templates yet')).toHaveLength(2)
  })

  it('banners a list that could not be read', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(await TemplatesData({ orgId: 'org_1' }))

    expect(
      screen.getByText('Templates could not be loaded')
    ).toBeInTheDocument()
  })
})
