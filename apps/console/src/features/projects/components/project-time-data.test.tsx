// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeIssue, makeProject, makeTimeEntry } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveProject: vi.fn(),
  listEntries: vi.fn(),
  listIssues: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/projects/proj_test/time',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projects: {
      retrieve: mocks.retrieveProject,
    },
    timeEntries: {
      list: mocks.listEntries,
    },
    issues: {
      list: mocks.listIssues,
    },
  },
}))

import { ProjectTimeData } from './project-time-data'

afterEach(cleanup)

describe('ProjectTimeData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveProject.mockResolvedValue({
      data: makeProject(),
      error: null,
    })
    mocks.listEntries.mockResolvedValue({
      data: listOf([makeTimeEntry()]),
      error: null,
    })
    mocks.listIssues.mockResolvedValue({
      data: listOf([makeIssue()]),
      error: null,
    })
  })

  it('renders project entries scoped to the project', async () => {
    render(
      await ProjectTimeData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      })
    )

    expect(mocks.listEntries).toHaveBeenCalledWith('org_1', {
      projectId: 'proj_test',
    })
    expect(screen.getByText('Static fire monitoring')).toBeInTheDocument()
    expect(screen.getByText('Merlin engine checkout')).toBeInTheDocument()
  })

  it('renders AppError when the project cannot be loaded', async () => {
    mocks.retrieveProject.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectTimeData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
      })
    )

    expect(screen.getByText('Project could not be loaded')).toBeInTheDocument()
  })

  it('calls notFound for an unknown project', async () => {
    mocks.retrieveProject.mockResolvedValue({
      data: null,
      error: { code: 'projects/project-not-found', message: 'missing' },
    })

    await expect(
      ProjectTimeData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_missing',
      })
    ).rejects.toThrow('not-found')
    expect(mocks.notFound).toHaveBeenCalled()
  })
})
