/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { EmailDelivery } from '@876/communications/contracts'

import { DeliveriesTable } from './deliveries-table'

function delivery(overrides: Partial<EmailDelivery> = {}): EmailDelivery {
  return {
    object: 'email_delivery',
    id: 'edlv_1',
    organizationId: 'org_target',
    resourceType: 'invoice',
    resourceId: 'inv_1',
    templateId: null,
    senderId: 'esnd_1',
    provider: 'resend',
    providerMessageId: 're_1',
    idempotencyKey: 'invoice:inv_1:send:1',
    fromName: 'Billing',
    fromEmail: 'billing@mail.87six.dev',
    replyTo: null,
    to: [{ email: 'customer@example.com' }],
    cc: [],
    bcc: [],
    subject: 'Invoice INV-0042',
    status: 'delivered',
    failureCode: null,
    failureMessage: null,
    queuedAt: 1_788_000_000,
    sentAt: 1_788_000_001,
    deliveredAt: 1_788_000_002,
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    complainedAt: null,
    failedAt: null,
    createdAt: 1_788_000_000,
    updatedAt: 1_788_000_002,
    ...overrides,
  }
}

describe('DeliveriesTable', () => {
  it('renders one row per delivery with recipient, subject, and status badge', () => {
    render(
      <DeliveriesTable
        state={{
          status: 'ready',
          data: [
            delivery(),
            delivery({
              id: 'edlv_2',
              to: [
                { email: 'second@example.com' },
                { email: 'third@example.com' },
              ],
              subject: 'Payment reminder',
              status: 'bounced',
            }),
          ],
        }}
      />
    )

    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(3)

    const first = within(rows[1])
    expect(first.getByText('customer@example.com')).toBeInTheDocument()
    expect(first.getByText('Invoice INV-0042')).toBeInTheDocument()
    expect(first.getByText('Delivered')).toBeInTheDocument()

    const second = within(rows[2])
    expect(second.getByText('second@example.com +1 more')).toBeInTheDocument()
    expect(second.getByText('Payment reminder')).toBeInTheDocument()
    expect(second.getByText('Bounced')).toBeInTheDocument()
  })

  it('renders an empty state instead of an empty table', () => {
    render(<DeliveriesTable state={{ status: 'empty' }} />)

    expect(screen.getByText('No deliveries yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders a service error inline without tearing the section down', () => {
    render(
      <DeliveriesTable
        state={{
          status: 'error',
          error: {
            code: 'communications/unavailable',
            message: 'Try again later.',
          },
        }}
      />
    )

    expect(screen.getByText('Deliveries')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Try again later.')).toBeInTheDocument()
    expect(screen.getByText('communications/unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
