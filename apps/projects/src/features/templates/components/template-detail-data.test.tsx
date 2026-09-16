import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function openActions() {
  await userEvent.setup().click(screen.getByRole('button', { name: 'More actions' }))
  await screen.findByRole('menu')
}

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  versions: vi.fn(),
  notFound: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projectTemplates: { retrieve: mocks.retrieve, versions: mocks.versions },
  },
}))
vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  useRouter: () => ({
    replace: mocks.replace,
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}))
vi.mock('./template-preview-data', () => ({
  TemplatePreviewData: () => <div data-testid="template-preview" />,
}))

const { TemplateDetailData } = await import('./template-detail-data')

const TEMPLATE = {
  object: 'projects.project-template',
  id: 'tpl_1',
  key: 'agile-sprint',
  name: 'Agile sprint',
  description: 'Two-week delivery cadence',
  currentVersion: 3,
  sourceProjectId: null,
  counts: { phases: 4, taskLists: 2, workItems: 12, dependencies: 3 },
  createdAt: 1788220800,
  updatedAt: 1788220800,
}

const VERSIONS = {
  object: 'list',
  data: [
    {
      object: 'projects.project-template-version',
      id: 'ver_3',
      templateId: 'tpl_1',
      version: 3,
      createdAt: 1788220800,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.retrieve.mockResolvedValue({ data: TEMPLATE, error: null })
  mocks.versions.mockResolvedValue({ data: VERSIONS, error: null })
})

describe('TemplateDetailData', () => {
  it('renders the summary, versions, and preview for the chosen start', async () => {
    render(
      await TemplateDetailData({
        orgId: 'org_1',
        templateId: 'tpl_1',
        start: '2026-09-01',
      })
    )

    // The toolbar heading and the summary heading share the template name.
    expect(
      screen.getAllByRole('heading', { name: 'Agile sprint' })
    ).toHaveLength(2)
    expect(screen.getByText('Two-week delivery cadence')).toBeInTheDocument()
    // The version badge and the version row share the current version.
    expect(screen.getAllByText('v3')).toHaveLength(2)
    expect(screen.getByTestId('template-preview')).toBeInTheDocument()
  })

  it('links to the edit page and the from-template page', async () => {
    render(
      await TemplateDetailData({
        orgId: 'org_1',
        templateId: 'tpl_1',
        start: undefined,
      })
    )

    expect(screen.getByRole('link', { name: 'Use' })).toHaveAttribute(
      'href',
      expect.stringContaining('/projects/new/from-template?templateId=tpl_1')
    )

    await openActions()

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/settings/templates/tpl_1/edit'
    )
  })

  it('answers a template that does not exist with not-found', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/template-not-found',
        message: 'That template does not exist.',
      },
    })

    render(
      await TemplateDetailData({
        orgId: 'org_1',
        templateId: 'tpl_missing',
        start: undefined,
      })
    )

    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('banners a template that could not be read', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(
      await TemplateDetailData({
        orgId: 'org_1',
        templateId: 'tpl_1',
        start: undefined,
      })
    )

    expect(
      screen.getByText('The template could not be loaded')
    ).toBeInTheDocument()
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
})
