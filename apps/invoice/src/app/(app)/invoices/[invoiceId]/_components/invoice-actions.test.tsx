/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/client', () => ({
  client: {
    documents: {
      delete: vi.fn(),
      finalize: vi.fn(),
      send: vi.fn(),
      void: vi.fn(),
      writeOff: vi.fn(),
    },
  },
}))

import { InvoiceActions } from './invoice-actions'

function renderActions(status: Parameters<typeof InvoiceActions>[0]['status']) {
  return render(
    <InvoiceActions
      invoiceId="inv_123"
      status={status}
      canWrite
      canRecordPayment
      recordPaymentHref="/invoices/inv_123/payments/new"
      documentNumber="INV-000123"
      totalAmount="$1,234.00"
    />
  )
}

describe('InvoiceActions', () => {
  it('shows Edit and Delete for a draft writer', async () => {
    const user = userEvent.setup()
    renderActions('DRAFT')
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/invoices/inv_123/edit'
    )
    await user.click(screen.getByLabelText('More actions'))
    expect(
      await screen.findByRole('menuitem', { name: 'Delete' })
    ).toBeVisible()
  })

  it('links an open invoice to the payments received workflow', () => {
    renderActions('OPEN')
    expect(
      screen.getByRole('link', { name: 'Record payment' })
    ).toHaveAttribute('href', '/invoices/inv_123/payments/new')
  })

  it('hides mutations and payment entry for a void invoice', () => {
    renderActions('VOID')
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Record payment' })
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument()
  })

  it('offers no invoice preferences item, which this app has no page for', async () => {
    const user = userEvent.setup()
    renderActions('DRAFT')
    await user.click(screen.getByLabelText('More actions'))
    await screen.findByRole('menuitem', { name: 'Delete' })
    expect(
      screen.queryByRole('menuitem', { name: 'Invoice preferences' })
    ).not.toBeInTheDocument()
  })
})
