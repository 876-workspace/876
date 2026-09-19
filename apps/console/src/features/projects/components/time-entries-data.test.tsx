// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeIssue, makeProject, makeTimeEntry } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  listProjects: vi.fn(),
  listIssues: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/time',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    timeEntries: {
      list: mocks.listEntries,
    },
    projects: {
      list: mocks.listProjects,
    },
    issues: {
      list: mocks.listIssues,
    },
  },
}))

import { TimeEntriesData } from './time-entries-data'

afterEach(cleanup)

describe('TimeEntriesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listEntries.mockResolvedValue({
      data: listOf([makeTimeEntry()]),
      error: null,
    })
    mocks.listProjects.mockResolvedValue({
      data: listOf([makeProject()]),
      error: null,
    })
    mocks.listIssues.mockResolvedValue({
      data: listOf([makeIssue()]),
      error: null,
    })
  })

  it('renders entry rows with totals and a timesheets link', async () => {
    render(
      await TimeEntriesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listEntries).toHaveBeenCalledWith('org_1', {})
    expect(screen.getByText('Static fire monitoring')).toBeInTheDocument()
    expect(screen.getByText('Merlin engine checkout')).toBeInTheDocument()
    expect(screen.getByText('Timesheets')).toBeInTheDocument()
  })

  it('passes project, status, and billable filters to the API', async () => {
    render(
      await TimeEntriesData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        approvalStatus: 'approved',
        billable: true,
      })
    )

    expect(mocks.listEntries).toHaveBeenCalledWith('org_1', {
      projectId: 'proj_test',
      approvalStatus: 'approved',
      billable: true,
    })
  })

  it('keeps the shell and shows a banner when loading fails', async () => {
    mocks.listEntries.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await TimeEntriesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('Some time data could not be loaded')
    ).toBeInTheDocument()
    expect(
      screen.getByText('No time entries match these filters.')
    ).toBeInTheDocument()
  })
})
