// @vitest-environment jsdom
import type { AdminSubscription } from '@876/admin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { SubscriptionsSplit } from '../subscriptions-split'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams('subscription=sub_1'),
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
    items: [],
    ...overrides,
  }
}

function renderSelected() {
  return render(
    <SubscriptionsSplit
      subscriptions={[aSubscription()] as unknown as AdminSubscription[]}
      billing={<div>Billing Content</div>}
      selectedId="sub_1"
      basePath="/orgs/test-org/subscriptions"
    />
  )
}

describe('SubscriptionsSplit close animation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the panel mounted and does not navigate on the close click', () => {
    renderSelected()

    act(() => {
      screen.getByLabelText('Close subscription details').click()
    })

    expect(push).not.toHaveBeenCalled()
    expect(screen.getByText('Billing Content')).toBeInTheDocument()
  })

  it('navigates to the list once the exit animation has run', () => {
    renderSelected()

    act(() => {
      screen.getByLabelText('Close subscription details').click()
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/orgs/test-org/subscriptions')
  })
})
