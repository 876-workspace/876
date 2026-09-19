import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ workload: vi.fn() }))

vi.mock('@/lib/clients/projects', () => ({
  projects: { reports: { workload: mocks.workload } },
}))

const { WorkloadReportData } = await import('./workload-data')

const PERIOD = { from: 1788220800, to: 1790812800 }

const REPORT = {
  object: 'projects.workload-report' as const,
  period: PERIOD,
  data: [
    {
      userId: 'usr_1',
      label: 'Ada',
      assignedOpenItems: 3,
      plannedMinutes: 600,
      loggedMinutes: 300,
      capacityMinutes: null,
      utilisationPercent: null,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.workload.mockResolvedValue({ data: REPORT, error: null })
})

describe('WorkloadReportData', () => {
  it('reads the workload over the period the page asked for', async () => {
    render(await WorkloadReportData({ orgId: 'org_1', period: PERIOD }))

    expect(mocks.workload).toHaveBeenCalledWith('org_1', {
      from: PERIOD.from,
      to: PERIOD.to,
    })
  })

  it('leaves utilisation unstated for a member with no capacity', async () => {
    render(await WorkloadReportData({ orgId: 'org_1', period: PERIOD }))

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('No capacity')).toBeInTheDocument()
  })

  it('banners a report it could not read and keeps the page mounted', async () => {
    mocks.workload.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(await WorkloadReportData({ orgId: 'org_1', period: PERIOD }))

    expect(
      screen.getByText('The workload report could not be loaded')
    ).toBeInTheDocument()
    expect(screen.queryByText('Ada')).not.toBeInTheDocument()
  })
})
