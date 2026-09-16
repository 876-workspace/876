import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ time: vi.fn() }))

vi.mock('@/lib/services/projects', () => ({
  projects: { reports: { time: mocks.time } },
}))

const { TimeReportData } = await import('./time-report-data')

const PERIOD = { from: 1788220800, to: 1790812800 }

const REPORT = {
  object: 'projects.time-report' as const,
  groupBy: 'user' as const,
  period: PERIOD,
  data: [
    { key: 'usr_1', label: 'Ada', billableMinutes: 90, nonBillableMinutes: 30 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.time.mockResolvedValue({ data: REPORT, error: null })
})

describe('TimeReportData', () => {
  it('groups the report by the dimension the page asked for', async () => {
    render(
      await TimeReportData({ orgId: 'org_1', period: PERIOD, groupBy: 'user' })
    )

    expect(mocks.time).toHaveBeenCalledWith('org_1', {
      groupBy: 'user',
      from: PERIOD.from,
      to: PERIOD.to,
    })
  })

  it('renders the grouped rows', async () => {
    render(
      await TimeReportData({ orgId: 'org_1', period: PERIOD, groupBy: 'user' })
    )

    const row = screen.getByText('Ada').closest('tr') as HTMLElement
    expect(within(row).getByText('1h 30m')).toBeInTheDocument()
  })

  it('banners a report it could not read and keeps the page mounted', async () => {
    mocks.time.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/invalid-period',
        message: 'Enter a valid report period.',
      },
    })

    render(
      await TimeReportData({ orgId: 'org_1', period: PERIOD, groupBy: 'user' })
    )

    expect(
      screen.getByText('The time report could not be loaded')
    ).toBeInTheDocument()
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()
  })
})
