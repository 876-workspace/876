/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ segments: ['customer_123'] }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegments: () => navigation.segments,
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@876/crm-ui/customer-list-shell', () => ({
  CustomerListShell: ({ toolbar }: { toolbar: ReactNode }) => toolbar,
}))

vi.mock('../_lib/use-customer-links', () => ({
  useCustomerLinks: () => (path: string) => path,
}))

import { CustomersShell } from './customers-shell'

describe('CustomersShell', () => {
  it('keeps Add available while a customer detail is open', () => {
    render(<CustomersShell list={null}>detail</CustomersShell>)

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/customers/new'
    )
  })

  it('renders the standard toolbar actions beside an open customer', async () => {
    const user = userEvent.setup()
    render(<CustomersShell list={null}>detail</CustomersShell>)
    await user.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'All Customers' })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('menuitem', { name: 'Refresh' })
    ).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/customers/new'
    )
  })
})
