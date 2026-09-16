import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ budgetVariance: vi.fn() }))

vi.mock('@/lib/services/projects', () => ({
  projects: { reports: { budgetVariance: mocks.budgetVariance } },
}))

const { BudgetVarianceData } = await import('./budget-variance-data')

const PERIOD = { from: 1788220800, to: 1790812800 }

const REPORT = {
  object: 'projects.budget-variance-report' as const,
  period: PERIOD,
  data: [
    {
      projectId: 'prj_1',
      name: 'Apollo',
      currency: 'USD',
      budgetMinor: '100000',
      actualCostMinor: '125000',
      varianceMinor: '-25000',
      budgetMinutes: 600,
      actualMinutes: 750,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.budgetVariance.mockResolvedValue({ data: REPORT, error: null })
})

describe('BudgetVarianceData', () => {
  it('reads the variance over the period the page asked for', async () => {
    render(await BudgetVarianceData({ orgId: 'org_1', period: PERIOD }))

    expect(mocks.budgetVariance).toHaveBeenCalledWith('org_1', {
      from: PERIOD.from,
      to: PERIOD.to,
    })
  })

  it('renders the variance as money', async () => {
    render(await BudgetVarianceData({ orgId: 'org_1', period: PERIOD }))

    expect(screen.getByText('-$250.00')).toBeInTheDocument()
  })

  it('banners a report it could not read and keeps the page mounted', async () => {
    mocks.budgetVariance.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'That organization does not exist.',
      },
    })

    render(await BudgetVarianceData({ orgId: 'org_1', period: PERIOD }))

    expect(
      screen.getByText('The budget variance report could not be loaded')
    ).toBeInTheDocument()
    expect(screen.queryByText('-$250.00')).not.toBeInTheDocument()
  })
})
