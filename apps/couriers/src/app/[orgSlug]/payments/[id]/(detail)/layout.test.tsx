/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { resolveServerTree } from '@/test/resolve-server-tree'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  retrievePayment: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  billingIntegration: { payments: { retrieve: mocks.retrievePayment } },
}))
vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}))
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  }
})

import PaymentDetailLayout, { generateMetadata } from './layout'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'pay_1' })

function createPayment(overrides: Record<string, unknown> = {}) {
  return {
    object: 'payment',
    id: 'pay_1',
    number: 'PAY-91',
    amount: '50000',
    unappliedAmount: '10000',
    amountRefunded: '0',
    status: 'SUCCEEDED',
    currency: 'JMD',
    paymentDate: 1_767_225_600,
    referenceNumber: 'REF-7',
    notes: null,
    bankCharges: '0',
    customer: { object: 'customer', id: 'cus_1', name: 'Alejandra Reyes' },
    paymentMode: {
      object: 'payment_mode',
      id: 'pm_1',
      name: 'Bank transfer',
      isDefault: true,
      isActive: true,
      isSystem: false,
      createdAt: 1,
      updatedAt: 1,
    },
    depositAccount: {
      object: 'bank_account',
      id: 'ba_1',
      name: 'Operating account',
      accountType: 'checking',
      currency: 'JMD',
    },
    invoiceAllocations: [
      {
        object: 'payment_allocation',
        id: 'pa_1',
        amount: '40000',
        createdAt: 1,
        updatedAt: 1,
        invoice: {
          object: 'invoice',
          id: 'inv_1',
          number: 'INV-1042',
          totalAmount: '40000',
          amountDue: '0',
          status: 'PAID',
        },
      },
    ],
    ...overrides,
  }
}

describe('PaymentDetailLayout', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      tenant: { id: 'tenant_123' },
    })
    mocks.retrievePayment.mockResolvedValue({
      data: createPayment(),
      error: null,
    })
    mocks.notFound.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })
  })

  it('renders the payment identity and status through the Billing card', async () => {
    render(await resolveServerTree(await PaymentDetailLayout({ params })))

    expect(screen.getByRole('heading', { name: 'PAY-91' })).toBeVisible()
    expect(screen.getByText('Succeeded')).toBeVisible()
    expect(screen.getAllByText(/Alejandra Reyes/).length).toBeGreaterThan(0)
    expect(mocks.retrievePayment).toHaveBeenCalledTimes(1)
    expect(mocks.retrievePayment).toHaveBeenCalledWith('org_123', 'pay_1')
  })

  it('renders the received and allocated amounts', async () => {
    render(await resolveServerTree(await PaymentDetailLayout({ params })))

    expect(screen.getByText(/500\.00/)).toBeVisible()
    expect(screen.getAllByText(/400\.00/).length).toBeGreaterThan(0)
    expect(screen.getByText('Operating account')).toBeVisible()
    expect(screen.getByText('Bank transfer')).toBeVisible()
  })

  it('links each allocation to its invoice detail route', async () => {
    render(await resolveServerTree(await PaymentDetailLayout({ params })))

    expect(screen.getByRole('link', { name: /INV-1042/ })).toHaveAttribute(
      'href',
      '/island-logistics/invoices/inv_1'
    )
  })

  it('closes back to the payments list', async () => {
    render(await resolveServerTree(await PaymentDetailLayout({ params })))

    expect(
      screen.getByRole('link', { name: 'Close payment details' })
    ).toHaveAttribute('href', '/island-logistics/payments')
  })

  it('titles the document with the payment number', async () => {
    await expect(generateMetadata({ params })).resolves.toEqual({
      title: 'PAY-91 - Payments',
    })
  })

  it('renders not found when the payment does not exist', async () => {
    mocks.retrievePayment.mockResolvedValue({
      data: null,
      error: { code: 'payment/not-found', message: 'Missing payment.' },
    })

    await expect(
      PaymentDetailLayout({ params }).then(resolveServerTree)
    ).rejects.toThrow('NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })
})
