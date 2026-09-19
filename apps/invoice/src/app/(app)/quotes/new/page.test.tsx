/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { act, render, screen, waitFor } from '@testing-library/react'
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
vi.mock('@/lib/clients/billing', () => ({
  getBilling: vi.fn().mockResolvedValue({
    taxRates: {
      list: vi.fn().mockResolvedValue({ data: { data: [] }, error: null }),
    },
  }),
}))

const NewQuotePage = (await import('./page')).default

describe('NewQuotePage', () => {
  it('renders the quote title and submit label without invoice copy', async () => {
    const customers = vi.fn().mockResolvedValue({
      data: { data: [{ id: 'cus_123', name: 'Alejandra Reyes' }] },
      error: null,
    })
    const items = vi.fn().mockResolvedValue({
      data: { data: [] },
      error: null,
    })
    mockGetInvoice.mockResolvedValue({
      customers: { list: customers },
      items: { list: items },
    })

    render(await NewQuotePage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole('heading', { name: 'New Quote' })).not.toBeNull()
    expect(
      await screen.findByRole('button', { name: 'Save as draft' })
    ).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'New Invoice' })).toBeNull()
    expect(screen.getByLabelText('Expiry date')).not.toBeNull()
    expect(screen.queryByLabelText('Payment terms')).toBeNull()
    // The customer picker is a server-backed typeahead now, so the page must
    // NOT prefetch a customer list — that was the bandwidth waste this change
    // removed.
    expect(customers).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects to no-access when no Invoice facade is available', async () => {
    mockGetInvoice.mockResolvedValue(null)

    await expect(
      NewQuotePage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow('REDIRECT:/no-access')

    expect(mockRedirect).toHaveBeenCalledTimes(1)
    expect(mockRedirect).toHaveBeenCalledWith('/no-access')
  })

  it('preselects an active customer from the customerId query', async () => {
    const retrieve = vi.fn().mockResolvedValue({
      data: {
        id: 'cus_123',
        name: 'Alejandra Reyes',
        companyName: null,
        email: 'alejandra@example.test',
        phone: null,
        workPhone: null,
        primaryContact: null,
        status: 'ACTIVE',
      },
      error: null,
    })
    mockGetInvoice.mockResolvedValue({
      customers: { retrieve },
      items: {
        list: vi.fn().mockResolvedValue({ data: { data: [] }, error: null }),
      },
    })

    await act(async () => {
      render(
        await NewQuotePage({
          searchParams: Promise.resolve({ customerId: 'cus_123' }),
        })
      )
    })

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveValue(
        'Alejandra Reyes'
      )
    )
    expect(retrieve).toHaveBeenCalledWith('cus_123')
  })
})
