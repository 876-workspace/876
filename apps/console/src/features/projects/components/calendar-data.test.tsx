// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeCalendarEntry, makeProject } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveCalendar: vi.fn(),
  listProjects: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/calendar',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    calendar: {
      retrieve: mocks.retrieveCalendar,
    },
    projects: {
      list: mocks.listProjects,
    },
  },
}))

import { CalendarData } from './calendar-data'

afterEach(cleanup)

describe('CalendarData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveCalendar.mockResolvedValue({
      data: { object: 'calendar', entries: [makeCalendarEntry()] },
      error: null,
    })
    mocks.listProjects.mockResolvedValue({
      data: listOf([makeProject()]),
      error: null,
    })
  })

  it('renders period entries with kind and project', async () => {
    render(
      await CalendarData({ organizationId: 'org_1', from: 1719792000, to: 1722470400 })
    )

    expect(mocks.retrieveCalendar).toHaveBeenCalledWith('org_1', {
      from: 1719792000,
      to: 1722470400,
    })
    expect(screen.getByText('Readiness review')).toBeInTheDocument()
    expect(screen.getByText('Meeting')).toBeInTheDocument()
    expect(screen.getByText('Falcon Heavy')).toBeInTheDocument()
    expect(screen.getByText('FAL-1')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is scheduled', async () => {
    mocks.retrieveCalendar.mockResolvedValue({
      data: { object: 'calendar', entries: [] },
      error: null,
    })

    render(
      await CalendarData({ organizationId: 'org_1', from: 1719792000, to: 1722470400 })
    )

    expect(
      screen.getByText('Nothing scheduled in this period.')
    ).toBeInTheDocument()
  })

  it('keeps the shell and shows a banner when loading fails', async () => {
    mocks.retrieveCalendar.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await CalendarData({ organizationId: 'org_1', from: 1719792000, to: 1722470400 })
    )

    expect(
      screen.getByText('Some calendar data could not be loaded')
    ).toBeInTheDocument()
  })
})
