// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeIssue,
  makeProject,
  makeProjectField,
  makeProjectFieldValue,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveProject: vi.fn(),
  listIssues: vi.fn(),
  listFields: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/projects/proj_test',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projects: {
      retrieve: mocks.retrieveProject,
    },
    issues: {
      list: mocks.listIssues,
    },
    projectCustomFields: {
      list: mocks.listFields,
    },
  },
}))

import { ProjectDetailData } from './project-detail-data'

function renderDetail() {
  return ProjectDetailData({
    organizationId: 'org_1',
    base: '/projects',
    projectId: 'proj_test',
  })
}

afterEach(cleanup)

describe('ProjectDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject({ customFields: [makeProjectFieldValue()] }),
      error: null,
    })
    mocks.listIssues.mockResolvedValue({
      data: listOf([makeIssue()]),
      error: null,
    })
    mocks.listFields.mockResolvedValue({
      data: listOf([makeProjectField()]),
      error: null,
    })
  })

  it('retrieves the project, its issues, and the field catalog', async () => {
    render(await renderDetail())

    expect(mocks.retrieveProject).toHaveBeenCalledWith('org_1', 'proj_test')
    expect(mocks.listIssues).toHaveBeenCalledWith('org_1', {
      project: 'proj_test',
    })
    expect(mocks.listFields).toHaveBeenCalledWith('org_1')
  })

  it('renders the project with its custom field values', async () => {
    render(await renderDetail())

    expect(screen.getByText('Falcon Heavy')).toBeInTheDocument()
    expect(screen.getByText('Custom fields')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  it('falls back to field keys and banners when the catalog fails', async () => {
    mocks.listFields.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await renderDetail())

    expect(
      screen.getByText('Some project details could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('team')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  it('hides the custom fields section when the project has none', async () => {
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })

    render(await renderDetail())

    expect(screen.getByText('Falcon Heavy')).toBeInTheDocument()
    expect(screen.queryByText('Custom fields')).toBeNull()
  })

  it('shows a banner when the project cannot be loaded', async () => {
    mocks.retrieveProject.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await renderDetail())

    expect(screen.getByText('Project could not be loaded')).toBeInTheDocument()
  })
})
