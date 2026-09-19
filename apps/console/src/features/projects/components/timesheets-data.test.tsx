// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeTimesheet } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listTimesheets: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/time/timesheets',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    timesheets: {
      list: mocks.listTimesheets,
    },
  },
}))

import { TimesheetsData } from './timesheets-data'

afterEach(cleanup)

describe('TimesheetsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listTimesheets.mockResolvedValue({
      data: listOf([makeTimesheet()]),
      error: null,
    })
  })

  it('renders timesheet rows with member and status', async () => {
    render(
      await TimesheetsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listTimesheets).toHaveBeenCalledWith('org_1', {})
    expect(screen.getByText('user_eng')).toBeInTheDocument()
    expect(screen.getAllByText('Submitted')).toHaveLength(2)
  })

  it('passes the status filter through to the API', async () => {
    render(
      await TimesheetsData({
        organizationId: 'org_1',
        base: '/projects',
        status: 'approved',
      })
    )

    expect(mocks.listTimesheets).toHaveBeenCalledWith('org_1', {
      status: 'approved',
    })
  })

  it('keeps the shell and shows a banner when loading fails', async () => {
    mocks.listTimesheets.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await TimesheetsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('Some timesheet data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('No timesheets yet.')).toBeInTheDocument()
  })
})
