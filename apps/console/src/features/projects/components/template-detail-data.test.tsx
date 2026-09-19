// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeProjectTemplate,
  makeProjectTemplateVersion,
  makeTemplatePreview,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveTemplate: vi.fn(),
  listVersions: vi.fn(),
  previewTemplate: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/templates/ptpl_test',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projectTemplates: {
      retrieve: mocks.retrieveTemplate,
      versions: mocks.listVersions,
      preview: mocks.previewTemplate,
    },
  },
}))

import { TemplateDetailData } from './template-detail-data'

const START_DATE = 1720000000

function renderDetail(templateId = 'ptpl_test') {
  return TemplateDetailData({
    organizationId: 'org_1',
    base: '/projects',
    templateId,
    startDate: START_DATE,
  })
}

afterEach(cleanup)

describe('TemplateDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveTemplate.mockResolvedValue({
      data: makeProjectTemplate(),
      error: null,
    })
    mocks.listVersions.mockResolvedValue({
      data: listOf([makeProjectTemplateVersion()]),
      error: null,
    })
    mocks.previewTemplate.mockResolvedValue({
      data: makeTemplatePreview(),
      error: null,
    })
  })

  it('retrieves the decoded template for the host organization', async () => {
    render(await renderDetail('ptpl%20test'))

    expect(mocks.retrieveTemplate).toHaveBeenCalledWith('org_1', 'ptpl test')
  })

  it('requests versions and a start-anchored preview together', async () => {
    render(await renderDetail())

    expect(mocks.listVersions).toHaveBeenCalledWith('org_1', 'ptpl_test')
    expect(mocks.previewTemplate).toHaveBeenCalledWith('org_1', 'ptpl_test', {
      startDate: START_DATE,
    })
  })

  it('renders the shared summary with key facts', async () => {
    render(await renderDetail())

    expect(screen.getByText('Web Launch')).toBeInTheDocument()
    expect(screen.getByText('web-launch')).toBeInTheDocument()
    expect(screen.getAllByText('v3')).toHaveLength(2)
  })

  it('renders one row per template version', async () => {
    mocks.listVersions.mockResolvedValue({
      data: listOf([
        makeProjectTemplateVersion({ id: 'v1', version: 1 }),
        makeProjectTemplateVersion({ id: 'v2', version: 2 }),
      ]),
      error: null,
    })

    render(await renderDetail())

    expect(screen.getByText('v1')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
  })

  it('shows an empty state when the template has no versions', async () => {
    mocks.listVersions.mockResolvedValue({ data: listOf([]), error: null })

    render(await renderDetail())

    expect(screen.getByText('No versions yet.')).toBeInTheDocument()
  })

  it('renders the shared preview phases and work items', async () => {
    render(await renderDetail())

    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('Kickoff')).toBeInTheDocument()
  })

  it('surfaces missing tenant references from the preview', async () => {
    mocks.previewTemplate.mockResolvedValue({
      data: makeTemplatePreview({
        missing: { workItemTypes: ['epic'], workflowStates: [], labels: [] },
      }),
      error: null,
    })

    render(await renderDetail())

    expect(
      screen.getByText('Some references are missing here')
    ).toBeInTheDocument()
    expect(screen.getByText(/Work item types: epic/)).toBeInTheDocument()
  })

  it('notFound when the template does not exist', async () => {
    mocks.retrieveTemplate.mockResolvedValue({
      data: null,
      error: { code: 'projects/template-not-found', message: 'missing' },
    })

    render(await renderDetail())

    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('shows a banner while keeping loaded sections when enrichment fails', async () => {
    mocks.previewTemplate.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await renderDetail())

    expect(
      screen.getByText('Some template details could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Web Launch')).toBeInTheDocument()
    expect(
      screen.getByText('Preview could not be loaded.')
    ).toBeInTheDocument()
  })

  it('links back to the host templates root', async () => {
    render(
      await TemplateDetailData({
        organizationId: 'org_1',
        base: '/workspace/acme/projects',
        templateId: 'ptpl_test',
        startDate: START_DATE,
      })
    )

    expect(screen.getByRole('link', { name: 'Back to templates' })).toHaveAttribute(
      'href',
      '/workspace/acme/projects/templates'
    )
  })
})
