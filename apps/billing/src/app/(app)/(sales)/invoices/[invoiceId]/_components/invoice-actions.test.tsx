/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteInvoice: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))
vi.mock('@/lib/client', () => ({
  client: {
    invoices: { delete: mocks.deleteInvoice, finalize: vi.fn(), void: vi.fn() },
  },
}))

import { InvoiceActions } from './invoice-actions'

describe('InvoiceActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteInvoice.mockResolvedValue({
      data: { id: 'inv_123' },
      error: null,
    })
  })

  it('shows Edit and Delete for a draft', async () => {
    const user = userEvent.setup()
    render(<InvoiceActions invoiceId="inv_123" status="DRAFT" />)
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/invoices/inv_123/edit'
    )
    await user.click(screen.getByLabelText('More actions'))
    expect(
      await screen.findByRole('menuitem', { name: 'Delete' })
    ).toBeVisible()
  })

  it('omits Delete for a sent invoice', () => {
    render(<InvoiceActions invoiceId="inv_123" status="SENT" />)
    expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument()
  })

  it('omits Edit and Delete for a paid invoice', () => {
    render(<InvoiceActions invoiceId="inv_123" status="PAID" />)
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument()
  })

  it('deletes the exact invoice and returns to the list', async () => {
    const user = userEvent.setup()
    render(<InvoiceActions invoiceId="inv_123" status="DRAFT" />)
    await user.click(screen.getByLabelText('More actions'))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() =>
      expect(mocks.deleteInvoice).toHaveBeenCalledWith('inv_123')
    )
    expect(mocks.push).toHaveBeenCalledWith('/invoices')
  })

  it('keeps the delete dialog open and renders the failure', async () => {
    mocks.deleteInvoice.mockResolvedValue({
      data: null,
      error: { message: 'Cannot delete invoice' },
    })
    const user = userEvent.setup()
    render(<InvoiceActions invoiceId="inv_123" status="DRAFT" />)
    await user.click(screen.getByLabelText('More actions'))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(
      (await screen.findAllByText('Cannot delete invoice')).at(-1)
    ).toBeVisible()
    expect(screen.getByRole('alertdialog')).toBeVisible()
  })
})
