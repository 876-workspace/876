// @vitest-environment jsdom
import type { AdminSubscription } from '@876/platform/compat'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionActivity } from '../subscription-activity'

function aSub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    created_at: 1_720_000_000,
    updated_at: 1_720_100_000,
    start_date: 1_720_010_000,
    trial_start: null,
    trial_end: null,
    cancel_at: null,
    canceled_at: null,
    ended_at: null,
    ...overrides,
  }
}

describe('SubscriptionActivity', () => {
  it('renders lifecycle events newest first', () => {
    render(
      <SubscriptionActivity
        subscription={
          aSub({ canceled_at: 1_720_050_000 }) as unknown as AdminSubscription
        }
      />
    )

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent('Last updated')
    expect(items[1]).toHaveTextContent('Canceled')
    expect(items[2]).toHaveTextContent('Started')
    expect(items[3]).toHaveTextContent('Created')
  })

  it('labels a future cancel_at as a scheduled cancellation', () => {
    render(
      <SubscriptionActivity
        subscription={
          aSub({
            cancel_at: 1_730_000_000,
          }) as unknown as AdminSubscription
        }
      />
    )

    expect(screen.getByText('Cancellation scheduled')).toBeInTheDocument()
    expect(screen.queryByText('Canceled')).not.toBeInTheDocument()
  })

  it('renders an empty timeline for a subscription without timestamps', () => {
    const { container } = render(
      <SubscriptionActivity
        subscription={
          aSub({
            created_at: null,
            updated_at: null,
            start_date: null,
          }) as unknown as AdminSubscription
        }
      />
    )
    expect(container.querySelectorAll('li')).toHaveLength(0)
  })
})
