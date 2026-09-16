import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ health: vi.fn() }))

vi.mock('@/lib/services/projects', () => ({
  projects: { reports: { health: mocks.health } },
}))

const { HealthReportData } = await import('./health-report-data')

const REPORT = {
  object: 'projects.health-report' as const,
  data: [
    {
      projectId: 'prj_1',
      name: 'Apollo',
      health: 'at-risk' as const,
      progressPercent: null,
      overdue: 2,
      openItems: 5,
      budgetConsumedPercent: 120,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.health.mockResolvedValue({ data: REPORT, error: null })
})

describe('HealthReportData', () => {
  it('reads the health report for the organization', async () => {
    render(
      await HealthReportData({ orgId: 'org_1', projectHrefBase: '/projects' })
    )

    expect(mocks.health).toHaveBeenCalledWith('org_1')
  })

  it('links each project to its detail page', async () => {
    render(
      await HealthReportData({ orgId: 'org_1', projectHrefBase: '/projects' })
    )

    expect(screen.getByRole('link', { name: 'Apollo' })).toHaveAttribute(
      'href',
      '/projects/prj_1'
    )
  })

  it('banners a report it could not read and keeps the page mounted', async () => {
    mocks.health.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(
      await HealthReportData({ orgId: 'org_1', projectHrefBase: '/projects' })
    )

    expect(
      screen.getByText('The health report could not be loaded')
    ).toBeInTheDocument()
    expect(screen.queryByText('Apollo')).not.toBeInTheDocument()
  })
})
