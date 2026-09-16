// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WebhookDeliveryTable } from './webhook-delivery-table'
import type { WebhookDelivery } from './types'

function makeDelivery(overrides?: Partial<WebhookDelivery>): WebhookDelivery {
  return {
    object: 'projects.webhook-delivery',
    id: 'whd_1',
    endpointId: 'whe_1',
    eventId: 'evt_1',
    eventType: 'issue.created',
    attempt: 1,
    status: 'succeeded',
    responseCode: 200,
    nextAttemptAt: null,
    createdAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('WebhookDeliveryTable', () => {
  afterEach(cleanup)

  it('renders the event type', () => {
    render(<WebhookDeliveryTable deliveries={[makeDelivery()]} />)
    expect(screen.getByText('issue.created')).toBeInTheDocument()
  })

  it('badges each delivery status', () => {
    render(
      <WebhookDeliveryTable
        deliveries={[
          makeDelivery({ id: 'a', status: 'succeeded' }),
          makeDelivery({ id: 'b', status: 'failed', eventType: 'time.logged' }),
          makeDelivery({ id: 'c', status: 'pending', eventType: 'issue.updated' }),
        ]}
      />
    )
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders the response code', () => {
    render(<WebhookDeliveryTable deliveries={[makeDelivery({ responseCode: 500 })]} />)
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('renders a dash without a response code', () => {
    render(<WebhookDeliveryTable deliveries={[makeDelivery({ responseCode: null })]} />)
    expect(
      within(screen.getByRole('table')).getAllByText('—').length
    ).toBeGreaterThan(0)
  })

  it('renders the attempt and next attempt', () => {
    render(
      <WebhookDeliveryTable
        deliveries={[
          makeDelivery({ attempt: 3, nextAttemptAt: Date.UTC(2026, 2, 4, 10, 0) / 1000 }),
        ]}
      />
    )
    expect(within(screen.getByRole('table')).getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Mar 4, 2026 10:00 UTC')).toBeInTheDocument()
  })

  it('labels the columns in table order', () => {
    render(<WebhookDeliveryTable deliveries={[makeDelivery()]} />)
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(headers).toEqual(['Event type', 'Status', 'Response', 'Attempt', 'Next attempt'])
  })

  it('renders the empty state', () => {
    render(<WebhookDeliveryTable deliveries={[]} />)
    expect(screen.getByText('No webhook deliveries yet')).toBeInTheDocument()
  })
})
