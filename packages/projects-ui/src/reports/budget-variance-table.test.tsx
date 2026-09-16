// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { BudgetVarianceReport, BudgetVarianceRow } from './types'
import { BudgetVarianceTable } from './budget-variance-table'

function makeRow(overrides?: Partial<BudgetVarianceRow>): BudgetVarianceRow {
  return {
    projectId: 'prj_1',
    name: 'Apollo',
    currency: 'USD',
    budgetMinor: '100000',
    actualCostMinor: '125000',
    varianceMinor: '-25000',
    budgetMinutes: 600,
    actualMinutes: 750,
    ...overrides,
  }
}

function makeReport(rows: BudgetVarianceRow[]): BudgetVarianceReport {
  return {
    object: 'projects.budget-variance-report',
    period: { from: 1704067200, to: 1706745600 },
    data: rows,
  }
}

describe('BudgetVarianceTable', () => {
  afterEach(cleanup)

  it('renders budget, actual cost, and variance money', () => {
    render(<BudgetVarianceTable report={makeReport([makeRow()])} />)

    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$1,250.00')).toBeInTheDocument()
    expect(screen.getByText('-$250.00')).toBeInTheDocument()
  })

  it('marks a negative variance as destructive', () => {
    render(<BudgetVarianceTable report={makeReport([makeRow()])} />)

    expect(screen.getByText('-$250.00')).toHaveClass('text-destructive')
  })

  it('leaves a positive variance unmarked', () => {
    render(
      <BudgetVarianceTable
        report={makeReport([makeRow({ varianceMinor: '25000' })])}
      />
    )

    expect(screen.getByText('$250.00')).not.toHaveClass('text-destructive')
  })

  it('renders an em dash for a missing budget', () => {
    render(
      <BudgetVarianceTable
        report={makeReport([makeRow({ budgetMinor: null })])}
      />
    )

    expect(screen.getAllByText('—')).toHaveLength(1)
  })

  it('renders an em dash when the currency is unknown', () => {
    render(
      <BudgetVarianceTable report={makeReport([makeRow({ currency: null })])} />
    )

    expect(screen.getAllByText('—')).toHaveLength(3)
  })

  it('renders budget and actual hours', () => {
    render(<BudgetVarianceTable report={makeReport([makeRow()])} />)

    expect(screen.getByText('10h')).toBeInTheDocument()
    expect(screen.getByText('12h 30m')).toBeInTheDocument()
  })

  it('renders an em dash for missing budget hours', () => {
    render(
      <BudgetVarianceTable
        report={makeReport([makeRow({ budgetMinutes: null })])}
      />
    )

    expect(screen.getAllByText('—')).toHaveLength(1)
  })

  it('renders a short empty state', () => {
    render(<BudgetVarianceTable report={makeReport([])} />)

    expect(screen.getByText('No budgets to compare')).toBeInTheDocument()
  })
})
