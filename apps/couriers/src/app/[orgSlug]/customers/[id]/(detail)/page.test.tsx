/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ resolveCustomer: vi.fn() }))

vi.mock('../_lib/customer-data', () => ({
  resolveCustomer: mocks.resolveCustomer,
}))

import CustomerOverviewPage from './page'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'cprof_123' })

function customer(overrides = {}) {
  return {
    profile: {
      billingCustomerId: 'cus_123',
      trn: '123-456-789',
      isCommercial: true,
    },
    identity: {
      name: 'Marlon Brown',
      companyName: 'Brown Trading',
      email: 'marlon@example.com',
      phone: '+18765550142',
    },
    mailbox: { number: 'KNG-1042' },
    branch: { name: 'Kingston' },
    ...overrides,
  }
}

describe('CustomerOverviewPage', () => {
  beforeEach(() => {
    mocks.resolveCustomer.mockResolvedValue(customer())
  })

  it('keeps the identity and courier fields in the customer overview', async () => {
    render(await CustomerOverviewPage({ params }))

    expect(screen.getByText('Identity')).toBeVisible()
    expect(screen.getByText('Courier details')).toBeVisible()
    expect(screen.getByText('Brown Trading')).toBeVisible()
    expect(screen.getByText('123-456-789')).toBeVisible()
    expect(screen.getByText('Yes')).toBeVisible()
  })

  it('shows a placeholder for identity fields that have no value', async () => {
    mocks.resolveCustomer.mockResolvedValue(
      customer({ identity: { ...customer().identity, companyName: null } })
    )

    render(await CustomerOverviewPage({ params }))

    expect(screen.getAllByText('—')).not.toHaveLength(0)
  })
})
