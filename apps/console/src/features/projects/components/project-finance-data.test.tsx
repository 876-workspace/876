// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeBilling,
  makeBudget,
  makeFinancialSummary,
  makeRate,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('not-found')
  }),
  retrieveBilling: vi.fn(),
  retrieveSummary: vi.fn(),
  listBudgets: vi.fn(),
  listRates: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/projects/proj_test/finance',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projectBilling: {
      retrieve: mocks.retrieveBilling,
      financialSummary: mocks.retrieveSummary,
    },
    budgets: {
      list: mocks.listBudgets,
    },
    rates: {
      list: mocks.listRates,
    },
  },
}))

import { ProjectFinanceData } from './project-finance-data'

afterEach(cleanup)

describe('ProjectFinanceData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveBilling.mockResolvedValue({
      data: makeBilling(),
      error: null,
    })
    mocks.retrieveSummary.mockResolvedValue({
      data: makeFinancialSummary(),
      error: null,
    })
    mocks.listBudgets.mockResolvedValue({
      data: listOf([makeBudget()]),
      error: null,
    })
    mocks.listRates.mockResolvedValue({
      data: listOf([makeRate()]),
      error: null,
    })
  })

  it('renders billing config, summary, budgets, and rates', async () => {
    render(
      await ProjectFinanceData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        from: 1710000000,
        to: 1720000000,
      })
    )

    expect(mocks.retrieveBilling).toHaveBeenCalledWith('org_1', 'proj_test')
    expect(mocks.retrieveSummary).toHaveBeenCalledWith('org_1', 'proj_test', {
      from: 1710000000,
      to: 1720000000,
    })
    expect(screen.getByText('Time and materials')).toBeInTheDocument()
    expect(screen.getByText('Alert at')).toBeInTheDocument()
    expect(screen.getByText('Bill rate')).toBeInTheDocument()
  })

  it('renders AppError when billing settings cannot be loaded', async () => {
    mocks.retrieveBilling.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectFinanceData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        from: 1710000000,
        to: 1720000000,
      })
    )

    expect(
      screen.getByText('Billing settings could not be loaded')
    ).toBeInTheDocument()
  })

  it('keeps billing config and banners the remaining failures', async () => {
    mocks.listBudgets.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await ProjectFinanceData({
        organizationId: 'org_1',
        base: '/projects',
        projectId: 'proj_test',
        from: 1710000000,
        to: 1720000000,
      })
    )

    expect(
      screen.getByText('Some finance data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Time and materials')).toBeInTheDocument()
  })
})
