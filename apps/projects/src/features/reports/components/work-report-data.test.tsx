import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ work: vi.fn() }))

vi.mock('@/lib/clients/projects', () => ({
  projects: { reports: { work: mocks.work } },
}))

const { WorkReportData } = await import('./work-report-data')

const PERIOD = { from: 1788220800, to: 1790812800 }

const REPORT = {
  object: 'projects.work-report' as const,
  period: PERIOD,
  byState: [{ key: 'todo', label: 'Todo', count: 6 }],
  byType: [{ key: 'task', label: 'Task', count: 6 }],
  byAssignee: [{ key: 'usr_1', label: 'Ada', count: 6 }],
  overdue: 2,
  total: 9,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.work.mockResolvedValue({ data: REPORT, error: null })
})

describe('WorkReportData', () => {
  it('reads the report over the period the page asked for', async () => {
    render(await WorkReportData({ orgId: 'org_1', period: PERIOD }))

    expect(mocks.work).toHaveBeenCalledWith('org_1', {
      from: PERIOD.from,
      to: PERIOD.to,
    })
  })

  it('renders the totals and the breakdowns', async () => {
    render(await WorkReportData({ orgId: 'org_1', period: PERIOD }))

    expect(screen.getByText('By state')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
  })

  it('keeps the page mounted and banners a report it could not read', async () => {
    mocks.work.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(await WorkReportData({ orgId: 'org_1', period: PERIOD }))

    expect(
      screen.getByText('The work report could not be loaded')
    ).toBeInTheDocument()
    expect(
      screen.getByText('That organization does not exist.')
    ).toBeInTheDocument()
    expect(screen.queryByText('By state')).not.toBeInTheDocument()
  })
})
