// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ProjectBilling } from '@876/projects'

import { BillingConfigSummary } from './billing-config-summary'

function makeBilling(overrides?: Partial<ProjectBilling>): ProjectBilling {
  return {
    object: 'projects.project-billing',
    id: 'pb_1',
    tenantId: 'tenant_1',
    projectId: 'prj_1',
    billingMethod: 'time-and-materials',
    currency: 'USD',
    billingCustomerId: 'cus_1',
    fixedFeeAmount: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

const props = {
  editHref: '/projects/prj_1/finance/billing/edit',
  canEdit: true,
}

describe('BillingConfigSummary', () => {
  afterEach(cleanup)

  it('renders an empty state without a billing configuration', () => {
    render(<BillingConfigSummary billing={null} {...props} />)

    expect(screen.getByText('No billing configuration yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set up billing' })).toHaveAttribute(
      'href',
      '/projects/prj_1/finance/billing/edit'
    )
  })

  it('renders the billing method, currency, and customer', () => {
    render(<BillingConfigSummary billing={makeBilling()} {...props} />)

    expect(screen.getByText('Time and materials')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('cus_1')).toBeInTheDocument()
  })

  it('shows the fixed fee only for fixed-fee billing', () => {
    const { unmount } = render(
      <BillingConfigSummary
        billing={makeBilling({
          billingMethod: 'fixed-fee',
          fixedFeeAmount: 250000,
        })}
        {...props}
      />
    )
    expect(screen.getByText('US$2,500.00')).toBeInTheDocument()
    unmount()
    cleanup()

    render(<BillingConfigSummary billing={makeBilling()} {...props} />)
    expect(screen.queryByText('Fixed fee')).not.toBeInTheDocument()
  })

  it('renders an unpriced fixed fee as Unpriced, never 0', () => {
    render(
      <BillingConfigSummary
        billing={makeBilling({
          billingMethod: 'fixed-fee',
          fixedFeeAmount: null,
        })}
        {...props}
      />
    )

    expect(screen.getByText('Unpriced')).toBeInTheDocument()
  })

  it('hides edit affordances without the edit permission', () => {
    render(
      <BillingConfigSummary billing={makeBilling()} {...props} canEdit={false} />
    )

    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
