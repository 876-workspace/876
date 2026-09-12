/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getInvoiceContext: vi.fn(),
  resolveAccessContext: vi.fn(),
  getBilling: vi.fn(),
  getPaymentFormData: vi.fn(),
  redirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`)
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: mocks.redirect,
}))
vi.mock('@876/ui/detail-card', () => ({
  DetailCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailCardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailCardHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
vi.mock('@876/ui/app-error', () => ({
  AppError: () => <div>Payment entry unavailable</div>,
}))
vi.mock('@/lib/auth/context', () => ({
  getInvoiceContext: mocks.getInvoiceContext,
}))
vi.mock('@/lib/auth/access-context', () => ({
  canAccess: () => true,
  resolveAccessContext: mocks.resolveAccessContext,
}))
vi.mock('@/lib/services/billing', () => ({ getBilling: mocks.getBilling }))
vi.mock('@/features/payments/payment-form-data', () => ({
  getPaymentFormData: mocks.getPaymentFormData,
}))
vi.mock('@/features/payments/components/payment-received-form', () => ({
  InvoicePaymentReceivedForm: ({
    prefill,
    returnHref,
  }: {
    prefill: { customerId: string; invoiceId: string }
    returnHref: string
  }) => (
    <output
      data-customer-id={prefill.customerId}
      data-invoice-id={prefill.invoiceId}
      data-return-href={returnHref}
    />
  ),
}))

const NewInvoicePaymentPage = (await import('./page')).default

const invoice = {
  id: 'inv_123',
  number: 'INV-000123',
  customerId: 'cus_123',
}

async function renderPage() {
  await act(async () => {
    render(
      await NewInvoicePaymentPage({
        params: Promise.resolve({ invoiceId: invoice.id }),
      })
    )
  })
}

describe('NewInvoicePaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getInvoiceContext.mockResolvedValue({ userId: 'usr_123', orgId: 'org_123' })
    mocks.resolveAccessContext.mockResolvedValue({ status: 'ok', context: {} })
    mocks.getBilling.mockResolvedValue({
      invoices: { retrieve: vi.fn().mockResolvedValue({ data: invoice, error: null }) },
    })
    mocks.getPaymentFormData.mockResolvedValue({
      data: {
        customers: [],
        accounts: [],
        modes: [],
        currencies: [],
        invoices: [],
        defaultCurrency: 'JMD',
      },
      error: null,
    })
  })

  it('renders the payment form prefilled from the invoice', async () => {
    await renderPage()

    expect(screen.getByRole('status')).toHaveAttribute('data-customer-id', 'cus_123')
    expect(screen.getByRole('status')).toHaveAttribute('data-invoice-id', 'inv_123')
  })

  it('refuses an unauthorized principal before loading billing data', async () => {
    mocks.resolveAccessContext.mockResolvedValue({ status: 'forbidden' })

    await expect(
      NewInvoicePaymentPage({ params: Promise.resolve({ invoiceId: invoice.id }) })
    ).rejects.toThrow('REDIRECT:/no-access')
    expect(mocks.getBilling).not.toHaveBeenCalled()
  })

  it('uses the invoice number in the payment title', async () => {
    await renderPage()

    expect(screen.getByRole('heading', { name: 'Payment for INV-000123' })).toBeVisible()
  })

  it('passes the invoice as the success and cancel destination', async () => {
    await renderPage()

    expect(screen.getByRole('status')).toHaveAttribute(
      'data-return-href',
      '/invoices/inv_123'
    )
  })
})
