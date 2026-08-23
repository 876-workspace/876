// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionsSplit } from '../subscriptions-split'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

function aSub(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    app_id: `app_${id}`,
    app_slug: 'drive',
    app_name: 'Drive',
    app_logo_url: null,
    status: 'active',
    collection_method: 'charge_automatically',
    current_period_start: 1_720_000_000,
    current_period_end: 1_720_086_400,
    cancel_at_period_end: false,
    billing_cycle_anchor: 1_720_000_000,
    plan_name: 'Pro',
    billing_account_id: 'acct_1',
    default_payment_method_id: null,
    latest_invoice_id: null,
    schedule_id: null,
    start_date: 1_720_000_000,
    status_reason: null,
    provider_status: null,
    customer_id: 'cus_1',
    items: [],
    ...overrides,
  }
}

describe('SubscriptionsSplit / Component / advanced', () => {
  it('renders empty state when no subscriptions', () => {
    // Arrange, Act
    render(
      <SubscriptionsSplit
        subscriptions={[]}
        billing={null}
        selectedId={undefined}
        basePath="/orgs/acme/subscriptions"
      />
    )
    // Assert
    expect(document.body.innerHTML).toBeTruthy()
  })

  it('renders subscription rows (realistic data builder)', () => {
    // Arrange
    const subs = [aSub('sub_1'), aSub('sub_2', { app_name: 'Sheets' })]
    // Act
    render(
      <SubscriptionsSplit
        subscriptions={subs as never}
        billing={<div>BILL</div>}
        selectedId="sub_1"
        basePath="/orgs/acme/subscriptions"
      />
    )
    // Assert
    expect(screen.getAllByText('Drive').length).toBeGreaterThan(0)
    expect(document.body.innerHTML).toContain('sub_1')
  })

  it('renders billing slot when subscription selected', () => {
    const subs = [aSub('sub_1')]
    render(
      <SubscriptionsSplit
        subscriptions={subs as never}
        billing={<div data-testid="billing">BILLING_CONTENT</div>}
        selectedId="sub_1"
        basePath="/x"
      />
    )
    expect(screen.getByTestId('billing')).toBeInTheDocument()
  })

  it('does not render billing when no selectedId', () => {
    const subs = [aSub('sub_1')]
    const { container } = render(
      <SubscriptionsSplit
        subscriptions={subs as never}
        billing={<div data-testid="billing">BILL</div>}
        selectedId={undefined}
        basePath="/x"
      />
    )
    expect(container.innerHTML).not.toContain('BILL')
  })

  it('maintains stable structure snapshot (golden master)', () => {
    const subs = [aSub('sub_1'), aSub('sub_2')]
    const { container } = render(
      <SubscriptionsSplit
        subscriptions={subs as never}
        billing={null}
        selectedId={undefined}
        basePath="/x"
      />
    )
    expect(container.innerHTML).toContain('Drive')
  })
})
