/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { VendorsTable } from './vendors-table'

const vendors = [
  {
    id: 'v_1',
    name: 'Alpha Supplies',
    email: 'alpha@test.com',
    phone: '123',
    reference: 'EXT-1',
    defaultCurrency: 'JMD',
    status: 'ACTIVE' as const,
  },
  {
    id: 'v_2',
    name: 'Beta Corp',
    email: null,
    phone: null,
    reference: 'External vendor',
    defaultCurrency: 'USD',
    status: 'ARCHIVED' as const,
  },
]

describe('VendorsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders vendor names with links', () => {
    render(<VendorsTable vendors={vendors} />)
    expect(
      screen.getByRole('link', { name: 'Alpha Supplies' })
    ).toHaveAttribute('href', '/purchases/vendors/v_1')
    expect(screen.getByText('alpha@test.com')).toBeTruthy()
    expect(screen.getByText('No contact details')).toBeTruthy()
  })

  it('renders reference and currency', () => {
    render(<VendorsTable vendors={vendors} />)
    expect(screen.getByText('EXT-1')).toBeTruthy()
    expect(screen.getByText('JMD')).toBeTruthy()
    expect(screen.getByText('USD')).toBeTruthy()
  })

  it('renders status badge lowercased', () => {
    render(<VendorsTable vendors={vendors} />)
    expect(screen.getByText('active')).toBeTruthy()
    expect(screen.getByText('archived')).toBeTruthy()
  })

  it('renders empty state', () => {
    render(<VendorsTable vendors={[]} emptyState={<div>no-vendors</div>} />)
    expect(screen.getByText('no-vendors')).toBeTruthy()
  })

  it('navigates on row click', async () => {
    const user = userEvent.setup()
    render(<VendorsTable vendors={vendors} />)
    const row = screen.getByText('Alpha Supplies').closest('tr')
    if (row) await user.click(row)
    expect(pushMock).toHaveBeenCalledWith('/purchases/vendors/v_1')
  })

  it('has correct headers', () => {
    const { container } = render(<VendorsTable vendors={vendors} />)
    expect(container.textContent).toContain('Vendor')
    expect(container.textContent).toContain('Reference')
    expect(container.textContent).toContain('Currency')
    expect(container.textContent).toContain('Status')
  })
})
