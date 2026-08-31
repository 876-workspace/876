// @vitest-environment jsdom
import type { AdminSubscription } from '@876/platform/compat'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionsSplit } from '../subscriptions-split'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/orgs/test-org/subscriptions',
}))

function aSubscription(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 'sub_1',
    status: 'active',
    app_name: '876 Couriers',
    app_slug: '876-couriers',
    app_id: 'app_couriers',
    current_period_end: 1000,
    billing_account_id: 'ba_1',
    default_payment_method_id: null,
    latest_invoice_id: null,
    schedule_id: null,
    billing_cycle_anchor: null,
    collection_method: 'charge_automatically',
    customer_id: 'cus_1',
    // Required on the resource, so a fixture without it is not a subscription.
    items: [],
    ...overrides,
  }
}

const subs = [
  aSubscription(),
  aSubscription({ id: 'sub_2', status: 'canceled', billing_account_id: null }),
]

describe('SubscriptionsSplit', () => {
  it('renders subscription list and billing slot', () => {
    render(
      <SubscriptionsSplit
        subscriptions={subs as unknown as AdminSubscription[]}
        billing={<div>Billing Content</div>}
        selectedId="sub_1"
        basePath="/orgs/test-org/subscriptions"
      />
    )
    expect(screen.getByText('Billing Content')).toBeInTheDocument()
  })

  it('does not render billing slot when no selection', () => {
    render(
      <SubscriptionsSplit
        subscriptions={subs as unknown as AdminSubscription[]}
        billing={<div>Billing Content</div>}
        selectedId={undefined}
        basePath="/orgs/test-org/subscriptions"
      />
    )
    expect(screen.queryByText('Billing Content')).not.toBeInTheDocument()
  })

  it('accepts billing as ReactNode (string, element, null)', () => {
    const { rerender } = render(
      <SubscriptionsSplit
        subscriptions={subs as unknown as AdminSubscription[]}
        billing={'plain text'}
        selectedId="sub_1"
        basePath="/x"
      />
    )
    expect(screen.getByText('plain text')).toBeInTheDocument()
    rerender(
      <SubscriptionsSplit
        subscriptions={subs as unknown as AdminSubscription[]}
        billing={null}
        selectedId="sub_1"
        basePath="/x"
      />
    )
    expect(screen.queryByText('plain text')).not.toBeInTheDocument()
  })
})
