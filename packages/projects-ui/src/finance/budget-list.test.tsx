// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Budget } from '@876/projects'

import { BudgetList } from './budget-list'

function makeBudget(overrides?: Partial<Budget>): Budget {
  return {
    object: 'projects.budget',
    id: 'bud_1',
    tenantId: 'tenant_1',
    projectId: 'prj_1',
    scope: 'project',
    milestoneId: null,
    userId: null,
    amountMinor: 100000,
    hours: null,
    thresholdPercent: 80,
    periodStart: null,
    periodEnd: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

const props = {
  currency: 'USD',
  newHref: '/projects/prj_1/finance/budgets/new',
  editBaseHref: '/projects/prj_1/finance/budgets',
  canEdit: true,
}

describe('BudgetList', () => {
  afterEach(cleanup)

  it('renders an empty state when there are no budgets', () => {
    render(<BudgetList budgets={[]} {...props} />)

    expect(screen.getAllByText('No budgets yet').length).toBeGreaterThan(0)
  })

  it('renders money budgets from integer minor units', () => {
    render(<BudgetList budgets={[makeBudget()]} {...props} />)

    expect(screen.getAllByText('US$1,000.00').length).toBeGreaterThan(0)
  })

  it('renders hour budgets and the alert threshold', () => {
    render(
      <BudgetList
        budgets={[makeBudget({ id: 'bud_2', amountMinor: null, hours: 120 })]}
        {...props}
      />
    )

    expect(screen.getAllByText('120h').length).toBeGreaterThan(0)
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0)
  })

  it('links each budget to its edit route', () => {
    render(<BudgetList budgets={[makeBudget()]} {...props} />)

    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute(
      'href',
      '/projects/prj_1/finance/budgets/bud_1/edit'
    )
  })

  it('hides edit affordances without the edit permission', () => {
    render(
      <BudgetList budgets={[makeBudget()]} {...props} canEdit={false} />
    )

    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Add budget' })
    ).not.toBeInTheDocument()
  })
})
