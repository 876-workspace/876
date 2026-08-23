// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionBillingSummary } from '../subscription-billing-summary'

// Factory — realistic data per guide
function anAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acct_876',
    name: 'Acme Robotics',
    email: 'billing@acme.test',
    currency: 'USD',
    taxExempt: 'none',
    balance: 4200,
    defaultPaymentMethodId: 'pm_default',
    ...overrides,
  }
}

function aCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm_default',
    displayLabel: 'Visa •••• 4242',
    isDefault: true,
    card: { brand: 'visa', last4: '4242' },
    expMonth: 9,
    expYear: 2031,
    ...overrides,
  }
}

describe('SubscriptionBillingSummary / Frontend Component / advanced', () => {
  it('renders billing account header via accessible role', () => {
    // Arrange
    const account = anAccount()
    // Act
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[aCard()]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId={null}
      />
    )
    // Assert
    expect(screen.getByText('Billing account (payer)')).toBeInTheDocument()
    expect(screen.getByText('Acme Robotics')).toBeInTheDocument()
  })

  it('prefers subscription payment method over default (business rule)', () => {
    // Arrange
    const account = anAccount({ defaultPaymentMethodId: 'pm_default' })
    const methods = [
      aCard({
        id: 'pm_default',
        displayLabel: 'Default •••• 1111',
        card: { brand: 'visa', last4: '1111' },
      }),
      aCard({
        id: 'pm_sub',
        displayLabel: 'Sub •••• 9999',
        isDefault: false,
        card: { brand: 'mastercard', last4: '9999' },
        expMonth: 1,
        expYear: 2032,
      }),
    ]
    // Act
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={methods}
        subscriptionPaymentMethodId="pm_sub"
        latestInvoiceId={null}
      />
    )
    // Assert
    expect(screen.getByText('Subscription payment method')).toBeInTheDocument()
    expect(screen.getByText('Sub •••• 9999 · 01/2032')).toBeInTheDocument()
  })

  it('redacts PAN-like displayLabel and falls back to brand+last4 (security)', () => {
    // Arrange
    const account = anAccount()
    const method = aCard({
      displayLabel: '4242 4242 4242 4242',
      card: { brand: 'visa', last4: '4242' },
    })
    // Act
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[method]}
        subscriptionPaymentMethodId="pm_default"
        latestInvoiceId={null}
      />
    )
    // Assert
    expect(screen.queryByText('4242 4242 4242 4242')).not.toBeInTheDocument()
    expect(screen.getByText('visa •••• 4242 · 09/2031')).toBeInTheDocument()
  })

  it('formats expiry with leading zero', () => {
    // Arrange
    const account = anAccount()
    const method = aCard({ expMonth: 3, expYear: 2030 })
    // Act
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[method]}
        subscriptionPaymentMethodId="pm_default"
        latestInvoiceId={null}
      />
    )
    // Assert
    expect(screen.getByText('Visa •••• 4242 · 03/2030')).toBeInTheDocument()
  })

  it('shows None when selected id missing', () => {
    // Arrange
    const account = anAccount({ defaultPaymentMethodId: 'pm_missing' })
    // Act
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[]}
        subscriptionPaymentMethodId="pm_missing"
        latestInvoiceId={null}
      />
    )
    // Assert
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('renders latest invoice as link when invoiceHref provided', () => {
    // Arrange
    const account = anAccount()
    // Act
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId="inv_123"
        invoiceHref="/orgs/acme/invoices/inv_123"
      />
    )
    // Assert
    const link = screen.getByRole('link', { name: 'inv_123' })
    expect(link).toHaveAttribute('href', '/orgs/acme/invoices/inv_123')
  })

  it('renders latest invoice as text when no href', () => {
    const account = anAccount()
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId="inv_999"
      />
    )
    expect(screen.getByText('inv_999')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('slices other methods to max 5', () => {
    const account = anAccount({ defaultPaymentMethodId: 'pm_0' })
    const methods = Array.from({ length: 10 }, (_, i) =>
      aCard({ id: `pm_${i}`, displayLabel: `Card ${i}`, isDefault: i === 1 })
    )
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={methods}
        subscriptionPaymentMethodId="pm_0"
        latestInvoiceId={null}
      />
    )
    // selected is pm_0, other = 9 filtered -> sliced to 5
    expect(screen.getByText('Other payment methods')).toBeInTheDocument()
    expect(screen.getByText(/Card 1/)).toBeInTheDocument()
    expect(screen.queryByText(/Card 9/)).not.toBeInTheDocument()
  })

  it('marks default badge only on isDefault', () => {
    const account = anAccount({ defaultPaymentMethodId: 'pm_0' })
    const methods = [
      aCard({ id: 'pm_0', displayLabel: 'Selected' }),
      aCard({ id: 'pm_1', displayLabel: 'Default', isDefault: true }),
      aCard({ id: 'pm_2', displayLabel: 'NotDefault', isDefault: false }),
    ]
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={methods}
        subscriptionPaymentMethodId="pm_0"
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Default')).toBeInTheDocument()
    // only one badge
    expect(screen.getAllByText('Default')).toHaveLength(1)
  })

  it('produces stable snapshot for full billing summary (golden master)', () => {
    const account = anAccount()
    const methods = [
      aCard(),
      aCard({
        id: 'pm_other',
        displayLabel: 'Amex •••• 3782',
        card: { brand: 'amex', last4: '3782' },
        isDefault: false,
      }),
    ]
    const { container } = render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={methods}
        subscriptionPaymentMethodId={null}
        latestInvoiceId="inv_123"
        invoiceHref="/invoices/inv_123"
      />
    )
    expect(container.innerHTML).toMatchInlineSnapshot(`
      "<div class="space-y-4"><dl class="divide-876-surface-border divide-y"><div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt class="text-muted-foreground shrink-0 text-[0.8125rem]">Billing account (payer)</dt><dd class="min-w-0 truncate text-right text-[0.8125rem]">Acme Robotics</dd></div><div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt class="text-muted-foreground shrink-0 text-[0.8125rem]">Currency</dt><dd class="min-w-0 truncate text-right text-[0.8125rem]">USD</dd></div><div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt class="text-muted-foreground shrink-0 text-[0.8125rem]">Tax status</dt><dd class="min-w-0 truncate text-right text-[0.8125rem]">none</dd></div><div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt class="text-muted-foreground shrink-0 text-[0.8125rem]">Balance</dt><dd class="min-w-0 truncate text-right text-[0.8125rem]">USD 4200</dd></div><div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt class="text-muted-foreground shrink-0 text-[0.8125rem]">Account ID</dt><dd class="text-muted-foreground min-w-0 truncate text-right font-mono text-xs">acct_876</dd></div><div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt class="text-muted-foreground shrink-0 text-[0.8125rem]">Billing account default</dt><dd class="min-w-0 truncate text-right text-[0.8125rem]">Visa •••• 4242 · 09/2031</dd></div><div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"><dt class="text-muted-foreground shrink-0 text-[0.8125rem]">Latest invoice</dt><dd class="text-muted-foreground min-w-0 truncate text-right font-mono text-xs"><a class="text-sky-600 hover:underline dark:text-sky-400" href="/invoices/inv_123">inv_123</a></dd></div></dl><div><div class="text-muted-foreground text-[0.6875rem] tracking-wide uppercase">Other payment methods</div><ul class="divide-876-surface-border mt-2 divide-y"><li class="flex items-center justify-between gap-3 py-2 text-[0.8125rem] first:pt-0 last:pb-0"><span class="min-w-0 truncate">Amex •••• 3782 · 09/2031</span></li></ul></div></div>"
    `)
  })

  it('handles fallback when card is malformed (robustness)', () => {
    const account = anAccount()
    const method = aCard({ card: 'not-an-object', displayLabel: null })
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[method]}
        subscriptionPaymentMethodId="pm_default"
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Payment method · 09/2031')).toBeInTheDocument()
  })

  it('uses fallback Unnamed billing account when name and email null', () => {
    const account = anAccount({ name: null, email: null })
    render(
      <SubscriptionBillingSummary
        account={account}
        paymentMethods={[]}
        subscriptionPaymentMethodId={null}
        latestInvoiceId={null}
      />
    )
    expect(screen.getByText('Unnamed billing account')).toBeInTheDocument()
  })
})
