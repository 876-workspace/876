/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/client', () => ({ client: { documents: { delete: vi.fn() } } }))

import { InvoiceActions } from './invoice-actions'

describe('InvoiceActions', () => {
  it('shows Edit and Delete for a draft writer', async () => {
    const user = userEvent.setup()
    render(<InvoiceActions invoiceId="inv_123" status="DRAFT" canWrite />)
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/invoices/inv_123/edit'
    )
    await user.click(screen.getByLabelText('More actions'))
    expect(
      await screen.findByRole('menuitem', { name: 'Delete' })
    ).toBeVisible()
  })

  it('hides both mutations for a void invoice', () => {
    render(<InvoiceActions invoiceId="inv_123" status="VOID" canWrite />)
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument()
  })
})
