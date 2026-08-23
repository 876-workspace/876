// @vitest-environment jsdom
import type { AdminSubscription } from '@876/admin'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SubscriptionDetail } from '../subscription-detail'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

const sub = {
  id: 'sub_1',
  status: 'active',
  current_period_end: 1000,
  billing_account_id: 'ba_1',
  default_payment_method_id: 'pm_1',
  latest_invoice_id: 'inv_1',
  schedule_id: 'sch_1',
  billing_cycle_anchor: 500,
  customer_id: 'cus_1',
  items: [],
  trial_end: null,
  cancel_at: null,
  canceled_at: null,
}

describe('SubscriptionDetail', () => {
  it('renders billing ReactNode instead of raw ids', () => {
    render(
      <SubscriptionDetail
        subscription={sub as unknown as AdminSubscription}
        billing={<div>Custom Billing</div>}
        now={1000}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('Custom Billing')).toBeInTheDocument()
    // old fields should not appear as raw ids
    expect(screen.queryByText('pm_1')).not.toBeInTheDocument()
    expect(screen.queryByText('inv_1')).not.toBeInTheDocument()
  })

  it('renders billing slot even when null', () => {
    render(
      <SubscriptionDetail
        subscription={sub as unknown as AdminSubscription}
        billing={null}
        now={1000}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText('Custom Billing')).not.toBeInTheDocument()
  })

  it('calls onClose when the close control is used', () => {
    const onClose = vi.fn()
    render(
      <SubscriptionDetail
        subscription={sub as unknown as AdminSubscription}
        billing={<div>x</div>}
        now={1000}
        onClose={onClose}
      />
    )

    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
