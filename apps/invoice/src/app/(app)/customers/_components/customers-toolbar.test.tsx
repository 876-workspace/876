/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/customers',
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { CustomersToolbar } from './customers-toolbar'

describe('CustomersToolbar', () => {
  it('keeps the standard actions and icon-only Add available with a customer open', async () => {
    const user = userEvent.setup()
    render(<CustomersToolbar status="all" showPrimary={false} />)
    await user.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'All Customers' })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('menuitem', { name: 'Refresh' })
    ).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'href',
      '/customers/import'
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

  it('renders the visible Add label in the list view', () => {
    render(<CustomersToolbar status="active" showPrimary />)

    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/customers/new'
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Active Customers' })
    ).toBeInTheDocument()
  })
})
