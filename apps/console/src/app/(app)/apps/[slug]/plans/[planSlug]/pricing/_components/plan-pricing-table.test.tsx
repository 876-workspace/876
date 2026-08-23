/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PlanPricingTable, type PricingSetup } from './plan-pricing-table'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const SETUP: PricingSetup = {
  productId: 'prod_4tVn8xQb',
  basePath: '/apps/876-billing/plans/test-plan/pricing',
  newHref: '/apps/876-billing/plans/test-plan/pricing/new',
  prices: [
    {
      id: 'price_9fKq2mLt',
      name: 'Starter monthly',
      nickname: null,
      unit_amount: 150000,
      currency: 'JMD',
      billing_interval: 'month',
      interval_count: 1,
      billing_scheme: 'per_unit',
      tiers_mode: null,
      trial_period_days: null,
      tax_behavior: 'exclusive',
      status: 'active',
    },
  ],
}

describe('PlanPricingTable', () => {
  it('renders price edit links from the serializable base path', () => {
    render(<PlanPricingTable setup={structuredClone(SETUP)} />)

    expect(
      screen.getByRole('link', { name: /starter monthly/i })
    ).toHaveAttribute(
      'href',
      '/apps/876-billing/plans/test-plan/pricing/price_9fKq2mLt/edit'
    )
  })
})
