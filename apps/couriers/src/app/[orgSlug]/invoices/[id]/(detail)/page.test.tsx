/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { resolveServerTree } from '@/test/resolve-server-tree'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  retrieveInvoice: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/billing', () => ({
  billingIntegration: { invoices: { retrieve: mocks.retrieveInvoice } },
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

import InvoiceOverviewPage from './page'

const params = Promise.resolve({ orgSlug: 'island-logistics', id: 'inv_1' })

function createInvoice(overrides: Record<string, unknown> = {}) {
  return {
    object: 'invoice',
    id: 'inv_1',
    number: 'INV-1042',
    status: 'SENT',
    currency: 'JMD',
    customerId: 'cus_1',
    customer: { object: 'customer', id: 'cus_1', name: 'Alejandra Reyes' },
    issueAt: 1756684800,
    dueAt: 1759276800,
    subtotalAmount: '250000',
    taxAmount: '37500',
    totalAmount: '287500',
    amountDue: '100000',
    amountPaid: '187500',
    ...overrides,
  }
}

describe('InvoiceOverviewPage', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue({
      orgId: 'org_123',
      tenant: { id: 'tenant_123' },
    })
    mocks.retrieveInvoice.mockResolvedValue({
      data: createInvoice(),
      error: null,
    })
    mocks.notFound.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })
  })

  it('renders the invoice identity in the Details section', async () => {
    render(await resolveServerTree(await InvoiceOverviewPage({ params })))

    expect(screen.getByText('Details')).toBeVisible()
    expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    expect(screen.getByText('SENT')).toBeVisible()
    expect(mocks.retrieveInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveInvoice).toHaveBeenCalledWith('org_123', 'inv_1')
  })

  it('renders the invoice amounts with Couriers money formatting', async () => {
    render(await resolveServerTree(await InvoiceOverviewPage({ params })))

    expect(screen.getByText('Amounts')).toBeVisible()
    expect(screen.getByText(/2,875\.00/)).toBeVisible()
    expect(screen.getByText(/1,000\.00/)).toBeVisible()
    expect(screen.getByText(/1,875\.00/)).toBeVisible()
  })

  it('renders not found when the invoice does not exist', async () => {
    mocks.retrieveInvoice.mockResolvedValue({
      data: null,
      error: { code: 'invoice/not-found', message: 'Missing invoice.' },
    })

    await expect(
      InvoiceOverviewPage({ params }).then(resolveServerTree)
    ).rejects.toThrow('NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })
})
