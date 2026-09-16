// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { FinancialSummary } from '@876/projects'

import { FinancialSummaryPanel } from './financial-summary-panel'

function makeSummary(overrides?: Partial<FinancialSummary>): FinancialSummary {
  return {
    object: 'projects.financial-summary',
    tenantId: 'tenant_1',
    projectId: 'prj_1',
    from: 1704067200,
    to: 1706745600,
    minutes: { plannedMinutes: 600, actualMinutes: 660, varianceMinutes: 60 },
    cost: { plannedMinor: 50000, actualMinor: 55000, varianceMinor: 5000 },
    revenue: { plannedMinor: 90000, actualMinor: 99000, varianceMinor: 9000 },
    unpricedMinutes: 0,
    budgets: [],
    ...overrides,
  }
}

describe('FinancialSummaryPanel', () => {
  afterEach(cleanup)

  it('renders planned versus actual hours, cost, and revenue', () => {
    render(
      <FinancialSummaryPanel summary={makeSummary()} currency="USD" />
    )

    expect(screen.getByText('11h 00m')).toBeInTheDocument()
    expect(screen.getByText('$550.00')).toBeInTheDocument()
    expect(screen.getByText('$990.00')).toBeInTheDocument()
  })

  it('flags unpriced minutes instead of pricing them at zero', () => {
    render(
      <FinancialSummaryPanel
        summary={makeSummary({ unpricedMinutes: 30 })}
        currency="USD"
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('30m')
  })

  it('renders an empty budget state', () => {
    render(<FinancialSummaryPanel summary={makeSummary()} currency="USD" />)

    expect(screen.getByText('No budgets yet')).toBeInTheDocument()
  })

  it('renders budget consumption with an over-budget flag', () => {
    render(
      <FinancialSummaryPanel
        summary={makeSummary({
          budgets: [
            {
              budgetId: 'bud_1',
              scope: 'project',
              kind: 'amount',
              spent: 110000,
              budget: 100000,
              percent: 110,
              overThreshold: true,
              overBudget: true,
              remaining: -10000,
            },
          ],
        })}
        currency="USD"
      />
    )

    expect(screen.getByText('Over budget')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '110'
    )
  })

  it('renders an over-threshold warning before the budget is exceeded', () => {
    render(
      <FinancialSummaryPanel
        summary={makeSummary({
          budgets: [
            {
              budgetId: 'bud_1',
              scope: 'project',
              kind: 'hours',
              spent: 85,
              budget: 100,
              percent: 85,
              overThreshold: true,
              overBudget: false,
              remaining: 15,
            },
          ],
        })}
        currency="USD"
      />
    )

    expect(screen.getByText('Over threshold')).toBeInTheDocument()
  })

  it('renders an em dash for missing planned money', () => {
    render(
      <FinancialSummaryPanel
        summary={makeSummary({
          cost: { plannedMinor: null, actualMinor: 1000, varianceMinor: null },
        })}
        currency="USD"
      />
    )

    expect(screen.getByText(/Planned — · Variance —/)).toBeInTheDocument()
  })
})
