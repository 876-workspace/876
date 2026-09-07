/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { mockGetInvoice } = vi.hoisted(() => ({ mockGetInvoice: vi.fn() }))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`)
  }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/invoice', () => ({ getInvoice: mockGetInvoice }))

const NewInvoicePage = (await import('./page')).default

describe('NewInvoicePage', () => {
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
        await NewInvoicePage({
          searchParams: Promise.resolve({ customerId: 'cus_123' }),
        })
      )
    })

    expect(screen.getByRole('heading', { name: 'New Invoice' })).not.toBeNull()
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveValue(
        'Alejandra Reyes'
      )
    )
    expect(retrieve).toHaveBeenCalledWith('cus_123')
  })
})
