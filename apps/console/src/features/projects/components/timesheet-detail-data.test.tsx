// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeIssue,
  makeProject,
  makeTimesheetDetail,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveTimesheet: vi.fn(),
  listProjects: vi.fn(),
  listIssues: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/time/timesheets/ts_test',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    timesheets: {
      retrieve: mocks.retrieveTimesheet,
    },
    projects: {
      list: mocks.listProjects,
    },
    issues: {
      list: mocks.listIssues,
    },
  },
}))

import { TimesheetDetailData } from './timesheet-detail-data'

afterEach(cleanup)

describe('TimesheetDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveTimesheet.mockResolvedValue({
      data: makeTimesheetDetail(),
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

  it('renders the summary totals and member entries', async () => {
    render(
      await TimesheetDetailData({
        organizationId: 'org_1',
        base: '/projects',
        timesheetId: 'ts_test',
      })
    )

    expect(mocks.retrieveTimesheet).toHaveBeenCalledWith('org_1', 'ts_test')
    expect(screen.getByText('Entries (1)')).toBeInTheDocument()
    expect(screen.getByText('Static fire monitoring')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('renders AppError when the timesheet cannot be loaded', async () => {
    mocks.retrieveTimesheet.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await TimesheetDetailData({
        organizationId: 'org_1',
        base: '/projects',
        timesheetId: 'ts_test',
      })
    )

    expect(
      screen.getByText('Timesheet could not be loaded')
    ).toBeInTheDocument()
  })

  it('calls notFound for an unknown timesheet', async () => {
    mocks.retrieveTimesheet.mockResolvedValue({
      data: null,
      error: { code: 'projects/timesheet-not-found', message: 'missing' },
    })

    await expect(
      TimesheetDetailData({
        organizationId: 'org_1',
        base: '/projects',
        timesheetId: 'ts_missing',
      })
    ).rejects.toThrow('not-found')
    expect(mocks.notFound).toHaveBeenCalled()
  })
})
