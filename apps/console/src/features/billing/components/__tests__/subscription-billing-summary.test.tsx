// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import {
  SubscriptionBillingSummary,
  SubscriptionBillingSummaryFallback,
} from '../subscription-billing-summary'

describe('SubscriptionBillingSummary', () => {
  it('renders Not set up when account is null', () => {
    render(
      <SubscriptionBillingSummary
        account={null}
        paymentMethods={[]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Not set up')).toBeInTheDocument()
    expect(screen.getByText('Billing account')).toBeInTheDocument()
  })

  it('renders account fields when account is present', () => {
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme Inc',
          email: 'billing@acme.test',
          currency: 'USD',
          taxExempt: 'none',
          balance: 1200,
          defaultPaymentMethodId: null,
        }}
        paymentMethods={[]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Acme Inc')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('acct_1')).toBeInTheDocument()
    expect(screen.getByText('none')).toBeInTheDocument()
  })

  it('prefers subscription payment method over account default', () => {
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme',
          email: null,
          currency: 'USD',
          taxExempt: null,
          balance: 0,
          defaultPaymentMethodId: 'pm_default',
        }}
        paymentMethods={[
          {
            id: 'pm_default',
            displayLabel: 'Default Card •••• 1111',
            isDefault: true,
            card: { brand: 'visa', last4: '1111' },
            expMonth: 12,
            expYear: 2030,
          },
          {
            id: 'pm_sub',
            displayLabel: 'Sub Card •••• 4242',
            isDefault: false,
            card: { brand: 'visa', last4: '4242' },
            expMonth: 1,
            expYear: 2030,
          },
        ]}
        subscriptionPaymentMethodId="pm_sub"
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Subscription payment method')).toBeInTheDocument()
    expect(screen.getByText('Sub Card •••• 4242 · 01/2030')).toBeInTheDocument()
  })

  it('falls back to billing account default when subscription method is null', () => {
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme',
          email: null,
          currency: null,
          taxExempt: null,
          balance: 0,
          defaultPaymentMethodId: 'pm_default',
        }}
        paymentMethods={[
          {
            id: 'pm_default',
            displayLabel: 'Default •••• 1111',
            isDefault: true,
            card: null,
            expMonth: null,
            expYear: null,
          },
        ]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Billing account default')).toBeInTheDocument()
    expect(screen.getByText('Default •••• 1111')).toBeInTheDocument()
  })

  it('shows None when no matching payment method', () => {
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme',
          email: null,
          currency: 'USD',
          taxExempt: null,
          balance: 0,
          defaultPaymentMethodId: 'pm_missing',
        }}
        paymentMethods={[]}
        subscriptionPaymentMethodId="pm_missing"
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('renders latest invoice id', () => {
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme',
          email: null,
          currency: 'USD',
          taxExempt: null,
          balance: 0,
          defaultPaymentMethodId: null,
        }}
        paymentMethods={[]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId="inv_123"
      />
    )
    expect(screen.getByText('inv_123')).toBeInTheDocument()
  })

  it('renders other payment methods up to 5 and marks default', () => {
    const methods = Array.from({ length: 7 }, (_, i) => ({
      id: `pm_${i}`,
      displayLabel: `Card ${i}`,
      isDefault: i === 1,
      card: null,
      expMonth: null,
      expYear: null,
    }))
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme',
          email: null,
          currency: 'USD',
          taxExempt: null,
          balance: 0,
          defaultPaymentMethodId: 'pm_0',
        }}
        paymentMethods={methods}
        subscriptionPaymentMethodId="pm_0"
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Other payment methods')).toBeInTheDocument()
    // pm_0 is selected, so otherMethods are pm_1..pm_5 (5 items), pm_6 is sliced off
    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.queryByText('Card 6')).not.toBeInTheDocument()
  })

  it('formats card detail with brand/last4 and expiry', () => {
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme',
          email: null,
          currency: 'USD',
          taxExempt: null,
          balance: 0,
          defaultPaymentMethodId: 'pm_1',
        }}
        paymentMethods={[
          {
            id: 'pm_1',
            displayLabel: null,
            isDefault: false,
            card: { brand: 'mastercard', last4: '5555' },
            expMonth: 9,
            expYear: 2026,
          },
        ]}
        subscriptionPaymentMethodId="pm_1"
        latestInvoiceId={null}
      />
    )
    expect(
      screen.getByText('mastercard •••• 5555 · 09/2026')
    ).toBeInTheDocument()
  })

  it('uses displayLabel when present and ignores card fields', () => {
    render(
      <SubscriptionBillingSummary
        account={{
          id: 'acct_1',
          name: 'Acme',
          email: null,
          currency: 'USD',
          taxExempt: null,
          balance: 0,
          defaultPaymentMethodId: 'pm_1',
        }}
        paymentMethods={[
          {
            id: 'pm_1',
            displayLabel: 'My Custom Label',
            isDefault: false,
            card: { brand: 'visa', last4: '4242' },
            expMonth: 12,
            expYear: 2030,
          },
        ]}
        subscriptionPaymentMethodId="pm_1"
        latestInvoiceId={null}
      />
    )
    // displayLabel takes precedence, still shows expiry suffix
    expect(screen.getByText('My Custom Label · 12/2030')).toBeInTheDocument()
  })
})

describe('SubscriptionBillingSummaryFallback', () => {
  it('renders loading skeleton', () => {
    const { container } = render(<SubscriptionBillingSummaryFallback />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })
})
