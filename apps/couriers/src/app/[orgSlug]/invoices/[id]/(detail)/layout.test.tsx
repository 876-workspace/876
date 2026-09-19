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
vi.mock('@/lib/clients/billing', () => ({
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

import InvoiceDetailLayout, { generateMetadata } from './layout'

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
    ...overrides,
  }
}

describe('InvoiceDetailLayout', () => {
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

  it('renders the invoice number with its status in the card header', async () => {
    render(
      await resolveServerTree(
        await InvoiceDetailLayout({
          children: <div data-testid="detail-body" />,
          params,
        })
      )
    )

    expect(screen.getByRole('heading', { name: 'INV-1042' })).toBeVisible()
    expect(screen.getByText('SENT')).toBeVisible()
    expect(screen.getByTestId('detail-body')).toBeInTheDocument()
    expect(mocks.retrieveInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveInvoice).toHaveBeenCalledWith('org_123', 'inv_1')
  })

  it('closes back to the invoices list', async () => {
    render(
      await resolveServerTree(
        await InvoiceDetailLayout({
          children: <div data-testid="detail-body" />,
          params,
        })
      )
    )

    expect(
      screen.getByRole('link', { name: 'Close invoice details' })
    ).toHaveAttribute('href', '/island-logistics/invoices')
  })

  it('titles the document with the invoice number', async () => {
    await expect(
      generateMetadata({ params, children: undefined })
    ).resolves.toEqual({
      title: 'INV-1042 - Invoices',
    })
  })

  it('renders not found when the invoice does not exist', async () => {
    mocks.retrieveInvoice.mockResolvedValue({
      data: null,
      error: { code: 'invoice/not-found', message: 'Missing invoice.' },
    })

    await expect(
      InvoiceDetailLayout({
        children: <div data-testid="detail-body" />,
        params,
      }).then(resolveServerTree)
    ).rejects.toThrow('NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })
})
