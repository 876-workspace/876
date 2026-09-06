/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { mockGetInvoice, mockRedirect } = vi.hoisted(() => ({
  mockGetInvoice: vi.fn(),
  mockRedirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`)
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/invoice', () => ({ getInvoice: mockGetInvoice }))

const NewQuotePage = (await import('./page')).default

describe('NewQuotePage', () => {
  it('renders the quote title and submit label without invoice copy', async () => {
    const customers = vi.fn().mockResolvedValue({
      data: { data: [{ id: 'cus_123', name: 'Alejandra Reyes' }] },
      error: null,
    })
    mockGetInvoice.mockResolvedValue({ customers: { list: customers } })

    render(await NewQuotePage())

    expect(screen.getByRole('heading', { name: 'New Quote' })).not.toBeNull()
    expect(await screen.findByRole('button', { name: 'Add quote' })).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'New Invoice' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add invoice' })).toBeNull()
    expect(customers).toHaveBeenCalledTimes(1)
    expect(customers).toHaveBeenCalledWith({ status: 'ACTIVE' })
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects to no-access when no Invoice facade is available', async () => {
    mockGetInvoice.mockResolvedValue(null)

    await expect(NewQuotePage()).rejects.toThrow('REDIRECT:/no-access')

    expect(mockRedirect).toHaveBeenCalledTimes(1)
    expect(mockRedirect).toHaveBeenCalledWith('/no-access')
  })
})
